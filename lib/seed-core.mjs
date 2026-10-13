// SQLite 마이그레이션과 합성 데이터 시드. 앱(lib/db.ts)과 `npm run db:seed`가 함께 쓴다.
// 서버 전용 모듈이다.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, 'db/migrations');
const SEED_DIR = join(ROOT, 'data/seed');

// 업무 테이블: 초기화 대상(FK 의존 역순으로 지운다). users·sessions는 남긴다.
const BUSINESS_TABLES = [
  'audit_log', 'inspection_plans', 'simulation_runs', 'findings', 'inspection_images',
  'port_calls', 'fatigue_records', 'thickness_measurements', 'members', 'vessels',
  'model_parameters', 'app_meta',
];

export function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name));
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    if (applied.has(file)) continue;
    db.transaction(() => {
      db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(file, new Date().toISOString());
    })();
  }
}

const readSeed = (name) => JSON.parse(readFileSync(join(SEED_DIR, name), 'utf8'));

function insertAll(db, table, rows, map) {
  if (rows.length === 0) return;
  const sample = map(rows[0]);
  const cols = Object.keys(sample);
  const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => `@${c}`).join(', ')})`);
  for (const row of rows) stmt.run(map(row));
}

/** 업무 테이블을 data/seed 내용으로 되돌린다(한 트랜잭션). */
export function resetBusinessData(db) {
  const meta = readSeed('meta.json');
  const params = readSeed('model-parameters.json');
  db.transaction(() => {
    for (const table of BUSINESS_TABLES) db.prepare(`DELETE FROM ${table}`).run();
    db.prepare('INSERT INTO app_meta (id, seed, as_of_date, notice, scenarios) VALUES (1, ?, ?, ?, ?)')
      .run(meta.seed, meta.asOfDate, meta.notice, JSON.stringify(meta.scenarios));
    insertAll(db, 'vessels', readSeed('vessels.json'), (v) => ({
      vessel_id: v.vesselId, name: v.name, ship_type: v.shipType, built_year: v.builtYear,
      gross_tonnage: v.grossTonnage, class_notation: v.classNotation,
      next_special_survey_due: v.nextSpecialSurveyDue, data_label: v.dataLabel,
    }));
    insertAll(db, 'members', readSeed('members.json'), (m) => ({
      member_id: m.memberId, vessel_id: m.vesselId, zone: m.zone, member_type: m.memberType, name: m.name,
      original_thickness_mm: m.originalThicknessMm, criticality: m.criticality, inspection_hours: m.inspectionHours,
    }));
    insertAll(db, 'thickness_measurements', readSeed('thickness-measurements.json'), (t) => ({
      measurement_id: t.measurementId, member_id: t.memberId, survey_date: t.surveyDate,
      thickness_mm: t.thicknessMm, source: t.source,
    }));
    insertAll(db, 'fatigue_records', readSeed('fatigue-records.json'), (f) => ({
      member_id: f.memberId, as_of_date: f.asOfDate, fatigue_usage: f.fatigueUsage,
      fatigue_rate_per_year: f.fatigueRatePerYear, source: f.source,
    }));
    insertAll(db, 'inspection_images', readSeed('inspection-images.json'), (i) => ({
      image_id: i.imageId, vessel_id: i.vesselId, member_id: i.memberId, captured_at: i.capturedAt,
      capture_method: i.captureMethod, image_path: i.imagePath, ai_status: i.aiStatus, ai_model_version: i.aiModelVersion,
    }));
    insertAll(db, 'findings', readSeed('findings.json'), (f) => ({
      finding_id: f.findingId, image_id: f.imageId, vessel_id: f.vesselId, member_id: f.memberId,
      ai_status: f.aiStatus, ai_label: f.aiLabel, ai_severity: f.aiSeverity, ai_confidence: f.aiConfidence,
      human_decision: f.humanDecision, human_label: f.humanLabel, human_severity: f.humanSeverity,
      human_note: f.humanNote, reviewed_by: f.reviewedBy, reviewed_at: f.reviewedAt, version: 0,
    }));
    insertAll(db, 'port_calls', readSeed('port-calls.json'), (p) => ({
      port_call_id: p.portCallId, vessel_id: p.vesselId, port: p.port, eta: p.eta,
      dwell_hours: p.dwellHours, inspector_available: p.inspectorAvailable ? 1 : 0,
    }));
    const { version, updatedBy, updatedAt, ...values } = params;
    db.prepare('INSERT INTO model_parameters (id, version, params, updated_by, updated_at) VALUES (1, ?, ?, ?, ?)')
      .run(version, JSON.stringify(values), updatedBy, updatedAt);
  })();
}

/** 시드 계정을 만들거나 비밀번호를 환경 변수 값으로 재설정한다. 비밀번호가 없으면 오류. */
export function seedUsers(db, env = process.env) {
  const users = readSeed('users.json');
  const missing = [...new Set(users.map((u) => u.passwordEnv))].filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`시드 계정 비밀번호 환경 변수가 없습니다: ${missing.join(', ')} (.env.example 참조)`);
  }
  const upsert = db.prepare(`INSERT INTO users (user_id, email, display_name, role, password_env, password_hash)
    VALUES (@user_id, @email, @display_name, @role, @password_env, @password_hash)
    ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name,
      role = excluded.role, password_env = excluded.password_env, password_hash = excluded.password_hash`);
  db.transaction(() => {
    for (const u of users) {
      upsert.run({
        user_id: u.userId, email: u.email, display_name: u.displayName, role: u.role,
        password_env: u.passwordEnv, password_hash: bcrypt.hashSync(env[u.passwordEnv], 10),
      });
    }
  })();
}

export function isSeeded(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM app_meta').get().n > 0;
}
