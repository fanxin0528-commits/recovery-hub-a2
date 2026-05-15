import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbDir = join(rootDir, 'db');
const dbPath = join(dbDir, 'recovery_hub.db');
const schemaPath = join(dbDir, 'schema.sql');
const seedPath = join(dbDir, 'seed.sql');

if (!existsSync(schemaPath)) throw new Error(`Missing schema file: ${schemaPath}`);
if (!existsSync(seedPath)) throw new Error(`Missing seed file: ${seedPath}`);

mkdirSync(dbDir, { recursive: true });

if (existsSync(dbPath)) rmSync(dbPath);

const db = new Database(dbPath);

try {
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(schemaPath, 'utf8'));
  db.exec(readFileSync(seedPath, 'utf8'));

  const users = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
  const contexts = db.prepare('SELECT COUNT(*) AS count FROM user_recovery_contexts').get() as { count: number };
  const logs = db.prepare('SELECT COUNT(*) AS count FROM recovery_logs').get() as { count: number };
  const discussions = db.prepare('SELECT COUNT(*) AS count FROM discussion_threads').get() as { count: number };

  console.log(`Reset SQLite database at ${dbPath}`);
  console.log(`Seeded ${users.count} users, ${contexts.count} contexts, ${logs.count} logs, ${discussions.count} discussions.`);
} finally {
  db.close();
}
