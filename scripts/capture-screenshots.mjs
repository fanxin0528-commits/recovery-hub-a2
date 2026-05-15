import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { get } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const chromePath = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const screenshotDir = path.resolve('docs/screenshots');

async function main() {
  if (!existsSync(chromePath)) {
    throw new Error(`Chrome not found at ${chromePath}. Set CHROME_PATH to a Chromium-compatible browser.`);
  }

  await assertServer();
  await mkdir(screenshotDir, { recursive: true });

  const userDataDir = await mkdtemp(path.join(tmpdir(), 'recovery-hub-chrome-'));
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: 'ignore' });

  let runError;

  try {
    const port = await readDevToolsPort(userDataDir);
    const { webSocketDebuggerUrl } = await getJson(`http://127.0.0.1:${port}/json/version`);
    const cdp = await CdpConnection.open(webSocketDebuggerUrl);
    const sessionId = await createPage(cdp);

    await send(cdp, 'Page.enable', {}, sessionId);
    await send(cdp, 'Runtime.enable', {}, sessionId);

    await navigate(cdp, sessionId, `${baseUrl}/login`);
    await wait(250);
    await send(cdp, 'Runtime.evaluate', {
      expression: `
        document.querySelector('input[name="userId"][value="1"]').checked = true;
        document.querySelector('form[action="/login"]').submit();
      `,
    }, sessionId);
    await wait(900);

    const targets = [
      { name: 'home-desktop.png', url: '/', width: 1440, height: 1100, scale: 1 },
      { name: 'explore-desktop.png', url: '/explore?stageId=2&bodyAreaId=1&goalId=1', width: 1440, height: 1100, scale: 1 },
      { name: 'home-mobile.png', url: '/', width: 390, height: 900, scale: 2 },
      { name: 'log-mobile.png', url: '/log/new', width: 390, height: 900, scale: 2 },
    ];

    for (const target of targets) {
      await setViewport(cdp, sessionId, target);
      await navigate(cdp, sessionId, `${baseUrl}${target.url}`);
      await wait(350);
      const screenshot = await send(cdp, 'Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
      }, sessionId);
      const outPath = path.join(screenshotDir, target.name);
      await writeFile(outPath, Buffer.from(screenshot.data, 'base64'));
      console.log(`Captured ${outPath}`);
    }

    cdp.close();
  } catch (error) {
    runError = error;
  } finally {
    chrome.kill('SIGTERM');
    await new Promise(resolve => {
      chrome.once('exit', resolve);
      setTimeout(resolve, 1200);
    });
    await removeTempDir(userDataDir);
  }

  if (runError) throw runError;
}

async function assertServer() {
  try {
    const response = await getJson(`${baseUrl}/login`, false);
    if (typeof response === 'string' && response.includes('Choose a Test Member')) return;
  } catch {
    // Report a clearer error below.
  }
  throw new Error(`Recovery Hub server is not ready at ${baseUrl}. Run npm run dev first.`);
}

function getJson(url, parseJson = true) {
  return new Promise((resolve, reject) => {
    get(url, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
      });
      response.on('end', () => {
        if (response.statusCode == null || response.statusCode >= 400) {
          reject(new Error(`GET ${url} failed with ${response.statusCode}`));
          return;
        }
        resolve(parseJson ? JSON.parse(body) : body);
      });
    }).on('error', reject);
  });
}

async function readDevToolsPort(userDataDir) {
  const file = path.join(userDataDir, 'DevToolsActivePort');
  for (let i = 0; i < 80; i += 1) {
    try {
      const [port] = (await readFile(file, 'utf8')).trim().split('\n');
      return Number(port);
    } catch {
      await wait(100);
    }
  }
  throw new Error('Timed out waiting for Chrome DevTools port.');
}

async function createPage(cdp) {
  const target = await send(cdp, 'Target.createTarget', { url: 'about:blank' });
  const attached = await send(cdp, 'Target.attachToTarget', {
    targetId: target.targetId,
    flatten: true,
  });
  return attached.sessionId;
}

async function navigate(cdp, sessionId, url) {
  await send(cdp, 'Page.navigate', { url }, sessionId);
  await waitForEvent(cdp, 'Page.loadEventFired', sessionId, 2500);
}

async function setViewport(cdp, sessionId, target) {
  await send(cdp, 'Emulation.setDeviceMetricsOverride', {
    width: target.width,
    height: target.height,
    deviceScaleFactor: target.scale,
    mobile: target.width < 700,
  }, sessionId);
}

function send(cdp, method, params = {}, sessionId = undefined) {
  return cdp.send(method, params, sessionId);
}

function waitForEvent(cdp, method, sessionId, timeoutMs) {
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      cdp.off(method, handler);
      resolve();
    }, timeoutMs);
    const handler = event => {
      if (event.sessionId !== sessionId) return;
      clearTimeout(timeout);
      cdp.off(method, handler);
      resolve();
    };
    cdp.on(method, handler);
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function removeTempDir(dir) {
  for (let i = 0; i < 6; i += 1) {
    try {
      await rm(dir, { recursive: true, force: true });
      return;
    } catch {
      await wait(250);
    }
  }
}

class CdpConnection {
  static open(url) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      const connection = new CdpConnection(socket);
      socket.addEventListener('open', () => resolve(connection), { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
  }

  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    socket.addEventListener('message', event => this.handleMessage(event));
  }

  send(method, params, sessionId) {
    const id = this.nextId;
    this.nextId += 1;
    this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) ?? new Set();
    handlers.add(handler);
    this.handlers.set(method, handlers);
  }

  off(method, handler) {
    this.handlers.get(method)?.delete(handler);
  }

  close() {
    this.socket.close();
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id != null) {
      const pending = this.pending.get(message.id);
      if (pending == null) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result ?? {});
      return;
    }

    const handlers = this.handlers.get(message.method);
    if (handlers == null) return;
    for (const handler of handlers) handler(message);
  }
}

await main();
