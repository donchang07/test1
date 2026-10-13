#!/usr/bin/env node
// SQLite를 만들고(마이그레이션) data/seed 합성 데이터와 시드 계정을 넣는다. 기존 업무 데이터는 시드로 되돌린다.
// 사용법: npm run db:seed   (DATABASE_PATH 기본값 data/app.db, 비밀번호는 .env.local의 SEED_* 변수)

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { migrate, resetBusinessData, seedUsers } from '../lib/seed-core.mjs';

const path = resolve(process.env.DATABASE_PATH || 'data/app.db');
mkdirSync(dirname(path), { recursive: true });
const db = new Database(path);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
migrate(db);
resetBusinessData(db);
seedUsers(db);
const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log(`시드 완료: ${path}`);
console.log({ vessels: count('vessels'), members: count('members'), findings: count('findings'), users: count('users') });
db.close();
