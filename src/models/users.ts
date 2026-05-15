import Database from 'better-sqlite3';

export interface NewUser {
  profileName: string;
}

export interface UserRecord {
  id: number | bigint;
  profileName: string;
}

export class Users {
  db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  listUsers(): UserRecord[] {
    return this.db.prepare(`
      SELECT
        user_id AS id,
        display_name AS profileName
      FROM users
      WHERE is_active = 1
      ORDER BY user_id;
    `).all() as UserRecord[];
  }

  userWithId(id: number): UserRecord | undefined {
    return this.db.prepare(`
      SELECT
        user_id AS id,
        display_name AS profileName
      FROM users
      WHERE user_id = ? AND is_active = 1;
    `).get(id) as UserRecord | undefined;
  }

  newUser(user: NewUser): UserRecord {
    const safeBase = user.profileName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 20) || 'tester';
    const username = `${safeBase}_${Date.now()}`;

    const id = this.db.prepare(`
      INSERT INTO users (
        username, display_name, email, role, is_active, created_at, updated_at
      )
      VALUES (?, ?, NULL, 'member', 1, datetime('now'), datetime('now'));
    `).run(username, user.profileName).lastInsertRowid;

    return { id, profileName: user.profileName };
  }
}
