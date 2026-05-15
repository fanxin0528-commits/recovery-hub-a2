import mojo, { MojoApp, yamlConfigPlugin } from '@mojojs/core';
import Database from 'better-sqlite3';
import fs from 'node:fs';

import { RecoveryHub } from './models/recoveryHub.js';
import { Users } from './models/users.js';

if (!fs.existsSync('config.yml')) createDefaultConfig();

export const app: MojoApp = mojo();

app.plugin(yamlConfigPlugin);
app.secrets = app.config.secrets;

const db = new Database(app.config.database);
db.pragma('foreign_keys = ON');

app.models.users = new Users(db);
app.models.recoveryHub = new RecoveryHub(db);

app.addContextHook('dispatch:before', async (ctx) => {
  const reqPath = ctx.req.path;

  if (reqPath === '/login') return;
  if (/\.\w+$/.test(reqPath)) return;

  const session = await ctx.session();
  if (!session.userId) {
    await ctx.redirectTo('/login');
    return false;
  }

  ctx.stash.profileName = session.profileName;
  ctx.stash.userId = session.userId;
});

app.get('/login').to('auth#loginPage');
app.post('/login').to('auth#loginAction');
app.get('/logout').to('auth#logout');

app.get('/').to('recovery#home');
app.get('/context').to('recovery#contextPage');
app.post('/context').to('recovery#contextAction');
app.get('/stage').to('recovery#stage');
app.get('/log/new').to('recovery#logNew');
app.post('/logs').to('recovery#logsAction');
app.get('/explore').to('recovery#explore');
app.get('/detail/:type/:id').to('recovery#detail');
app.post('/discussion-replies').to('recovery#replyAction');
app.post('/saved-items').to('recovery#saveAction');
app.post('/content-reports').to('recovery#reportAction');
app.get('/account').to('recovery#account');

app.start();

function createDefaultConfig() {
  const passwordOptions = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$^&*()/?'.split('');
  let secret = '';
  for (let i = 0; i < 16; i += 1) {
    secret += passwordOptions[Math.floor(Math.random() * passwordOptions.length)];
  }

  fs.writeFileSync('config.yml', `---
secrets:
  - ${secret}
database: "db/recovery_hub.db"
`);
}
