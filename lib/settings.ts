import 'server-only';
import { randomBytes } from 'node:crypto';
import { db } from './db';
import { PARAM_FIELDS, type ParamKey, type ParamValues } from './param-spec';

// DATA-008 모델 파라미터 읽기·저장, DATA-011 변경 이력(params.update)

type StoredParams = {
  allowableDiminutionPct: number;
  findingFactorPerSeverity: number;
  defaultCorrosionRateMmPerYear: number;
  routeSeverityMultipliers: Record<string, number>;
  riskThresholds: { high: number; medium: number };
  defaultBudgetHours: number;
};

export type HistoryRow = { auditId: string; text: string };

const PATH: Record<ParamKey, string> = {
  allowableDiminutionPct: 'allowableDiminutionPct',
  findingFactorPerSeverity: 'findingFactorPerSeverity',
  defaultCorrosionRateMmPerYear: 'defaultCorrosionRateMmPerYear',
  riskHigh: 'riskThresholds.high',
  riskMedium: 'riskThresholds.medium',
  defaultBudgetHours: 'defaultBudgetHours',
};
const NAME_BY_PATH = Object.fromEntries(PARAM_FIELDS.map((f) => [PATH[f.key], f.name]));

function readStored(): { version: number; params: StoredParams } {
  const row = db().prepare('SELECT version, params FROM model_parameters WHERE id = 1').get() as { version: number; params: string };
  return { version: row.version, params: JSON.parse(row.params) };
}

function flatten(p: StoredParams): ParamValues {
  return {
    allowableDiminutionPct: p.allowableDiminutionPct,
    findingFactorPerSeverity: p.findingFactorPerSeverity,
    defaultCorrosionRateMmPerYear: p.defaultCorrosionRateMmPerYear,
    riskHigh: p.riskThresholds.high,
    riskMedium: p.riskThresholds.medium,
    defaultBudgetHours: p.defaultBudgetHours,
  };
}

export function currentParams(): ParamValues {
  return flatten(readStored().params);
}

/** 검증된 값을 저장한다. 바뀐 항목만 감사 로그에 남기고 version을 1 올린다. 바뀐 것이 없으면 false. */
export function saveParams(values: ParamValues, actor: string): boolean {
  const conn = db();
  return conn.transaction(() => {
    const { version, params } = readStored();
    const prev = flatten(params);
    const before: Record<string, number> = {};
    const after: Record<string, number> = {};
    for (const f of PARAM_FIELDS) {
      if (prev[f.key] !== values[f.key]) {
        before[PATH[f.key]] = prev[f.key];
        after[PATH[f.key]] = values[f.key];
      }
    }
    if (Object.keys(after).length === 0) return false;
    const next: StoredParams = {
      ...params,
      allowableDiminutionPct: values.allowableDiminutionPct,
      findingFactorPerSeverity: values.findingFactorPerSeverity,
      defaultCorrosionRateMmPerYear: values.defaultCorrosionRateMmPerYear,
      riskThresholds: { high: values.riskHigh, medium: values.riskMedium },
      defaultBudgetHours: values.defaultBudgetHours,
    };
    const now = new Date().toISOString();
    conn.prepare('UPDATE model_parameters SET version = ?, params = ?, updated_by = ?, updated_at = ? WHERE id = 1')
      .run(version + 1, JSON.stringify(next), actor, now);
    conn.prepare('INSERT INTO audit_log (audit_id, actor, action, target, before, after, at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomBytes(8).toString('hex'), actor, 'params.update', 'model_parameters', JSON.stringify(before), JSON.stringify(after), now);
    return true;
  })();
}

const seoul = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});

/** SCR-008-EL-11: 최신 10건. `{일시} · {사용자} · {항목}: {이전} → {이후}` (여러 항목이면 쉼표로 잇는다) */
export function paramsHistory(): HistoryRow[] {
  const rows = db().prepare(`SELECT a.audit_id, a.before, a.after, a.at, COALESCE(u.display_name, a.actor) AS actor
    FROM audit_log a LEFT JOIN users u ON u.user_id = a.actor
    WHERE a.action = 'params.update' ORDER BY a.at DESC, a.audit_id DESC LIMIT 10`).all() as
    Array<{ audit_id: string; before: string; after: string; at: string; actor: string }>;
  return rows.map((r) => {
    const before = JSON.parse(r.before) as Record<string, number>;
    const after = JSON.parse(r.after) as Record<string, number>;
    const changes = Object.keys(after).map((path) => `${NAME_BY_PATH[path] ?? path}: ${before[path]} → ${after[path]}`).join(', ');
    return { auditId: r.audit_id, text: `${seoul.format(new Date(r.at))} · ${r.actor} · ${changes}` };
  });
}
