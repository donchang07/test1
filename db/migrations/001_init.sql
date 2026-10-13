-- KR Smart RBI 초기 스키마 (PRD 부록 A). JSON 컬럼은 TEXT에 JSON 문자열로 저장한다.

CREATE TABLE IF NOT EXISTS app_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  seed INTEGER NOT NULL,
  as_of_date TEXT NOT NULL,
  notice TEXT NOT NULL,
  scenarios TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('inspector', 'admin')),
  password_env TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vessels (
  vessel_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ship_type TEXT NOT NULL,
  built_year INTEGER NOT NULL,
  gross_tonnage INTEGER NOT NULL,
  class_notation TEXT NOT NULL,
  next_special_survey_due TEXT NOT NULL,
  data_label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  member_id TEXT PRIMARY KEY,
  vessel_id TEXT NOT NULL REFERENCES vessels(vessel_id),
  zone TEXT NOT NULL,
  member_type TEXT NOT NULL,
  name TEXT NOT NULL,
  original_thickness_mm REAL NOT NULL,
  criticality INTEGER NOT NULL CHECK (criticality BETWEEN 1 AND 3),
  inspection_hours REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS thickness_measurements (
  measurement_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(member_id),
  survey_date TEXT NOT NULL,
  thickness_mm REAL NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fatigue_records (
  member_id TEXT PRIMARY KEY REFERENCES members(member_id),
  as_of_date TEXT NOT NULL,
  fatigue_usage REAL NOT NULL,
  fatigue_rate_per_year REAL NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inspection_images (
  image_id TEXT PRIMARY KEY,
  vessel_id TEXT NOT NULL REFERENCES vessels(vessel_id),
  member_id TEXT NOT NULL REFERENCES members(member_id),
  captured_at TEXT NOT NULL,
  capture_method TEXT NOT NULL,
  image_path TEXT NOT NULL,
  ai_status TEXT NOT NULL CHECK (ai_status IN ('completed', 'failed')),
  ai_model_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS findings (
  finding_id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL REFERENCES inspection_images(image_id),
  vessel_id TEXT NOT NULL REFERENCES vessels(vessel_id),
  member_id TEXT NOT NULL REFERENCES members(member_id),
  ai_status TEXT NOT NULL,
  ai_label TEXT,
  ai_severity INTEGER,
  ai_confidence REAL,
  human_decision TEXT NOT NULL DEFAULT 'pending' CHECK (human_decision IN ('pending', 'confirmed', 'rejected')),
  human_label TEXT,
  human_severity INTEGER,
  human_note TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  version INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS findings_vessel ON findings(vessel_id);

CREATE TABLE IF NOT EXISTS port_calls (
  port_call_id TEXT PRIMARY KEY,
  vessel_id TEXT NOT NULL REFERENCES vessels(vessel_id),
  port TEXT NOT NULL,
  eta TEXT NOT NULL,
  dwell_hours INTEGER NOT NULL,
  inspector_available INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS model_parameters (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  params TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS simulation_runs (
  run_id TEXT PRIMARY KEY,
  vessel_id TEXT NOT NULL REFERENCES vessels(vessel_id),
  horizon_years INTEGER NOT NULL,
  route TEXT NOT NULL,
  params_snapshot TEXT NOT NULL,
  results TEXT NOT NULL,
  counts TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS simulation_runs_vessel ON simulation_runs(vessel_id, created_at);

CREATE TABLE IF NOT EXISTS inspection_plans (
  plan_id TEXT PRIMARY KEY,
  vessel_id TEXT NOT NULL UNIQUE REFERENCES vessels(vessel_id),
  run_id TEXT NOT NULL REFERENCES simulation_runs(run_id),
  budget_hours INTEGER NOT NULL,
  items TEXT NOT NULL,
  excluded TEXT NOT NULL,
  total_hours REAL NOT NULL,
  coverage_pct REAL NOT NULL,
  mandatory_count INTEGER NOT NULL,
  port_call_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'review_requested', 'approved', 'rejected')),
  reject_reason TEXT,
  requested_by TEXT,
  decided_by TEXT,
  decided_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  before TEXT NOT NULL,
  after TEXT NOT NULL,
  at TEXT NOT NULL
);
