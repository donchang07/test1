import 'server-only';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { isSeeded, migrate, resetBusinessData, seedUsers } from './seed-core.mjs';

type DB = Database.Database;

const globalForDb = globalThis as unknown as { rbiDb?: DB };

export function databasePath(): string {
  return resolve(process.env.DATABASE_PATH || 'data/app.db');
}

/** SQLite 연결(프로세스당 1개). 처음 열 때 마이그레이션하고 비어 있으면 시드를 넣는다. */
export function db(): DB {
  if (globalForDb.rbiDb) return globalForDb.rbiDb;
  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });
  const conn = new Database(path);
  conn.pragma('journal_mode = WAL');
  conn.pragma('foreign_keys = ON');
  migrate(conn);
  if (!isSeeded(conn)) resetBusinessData(conn);
  const userCount = (conn.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  if (userCount === 0) {
    try {
      seedUsers(conn);
    } catch (error) {
      console.warn(`[db] ${(error as Error).message} — 로그인할 수 없습니다.`);
    }
  }
  globalForDb.rbiDb = conn;
  return conn;
}

export function resetAll(options: { users: boolean }) {
  const conn = db();
  resetBusinessData(conn);
  if (options.users) seedUsers(conn);
}
