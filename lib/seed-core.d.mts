import type Database from 'better-sqlite3';

export function migrate(db: Database.Database): void;
export function resetBusinessData(db: Database.Database): void;
export function seedUsers(db: Database.Database, env?: Record<string, string | undefined>): void;
export function isSeeded(db: Database.Database): boolean;
