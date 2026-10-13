import 'server-only';
import { randomBytes } from 'node:crypto';
import { db } from './db';
import { optimize, type PlanItem, type PortCall } from './model';
import type { PlanStatus } from './queries';
import { latestRun } from './simulation';

// DATA-010 검사 계획: 최적화 저장(FR-028~030)과 상태 전이(FR-031), 감사 로그(FR-019)

export type Plan = {
  planId: string; vesselId: string; runId: string; budgetHours: number; items: PlanItem[]; excluded: PlanItem[];
  totalHours: number; coveragePct: number; mandatoryCount: number; port: PortCall | null;
  status: PlanStatus; rejectReason: string | null; updatedAt: string;
};

type Row = Record<string, unknown>;

export function getPlan(vesselId: string): Plan | null {
  const r = db().prepare('SELECT * FROM inspection_plans WHERE vessel_id = ?').get(vesselId) as Row | undefined;
  if (!r) return null;
  const port = r.port_call_id
    ? db().prepare('SELECT port_call_id, port, eta, dwell_hours FROM port_calls WHERE port_call_id = ?').get(r.port_call_id) as Row
    : null;
  return {
    planId: r.plan_id as string,
    vesselId: r.vessel_id as string,
    runId: r.run_id as string,
    budgetHours: r.budget_hours as number,
    items: JSON.parse(r.items as string),
    excluded: JSON.parse(r.excluded as string),
    totalHours: r.total_hours as number,
    coveragePct: r.coverage_pct as number,
    mandatoryCount: r.mandatory_count as number,
    port: port ? { portCallId: port.port_call_id as string, port: port.port as string, eta: port.eta as string, dwellHours: port.dwell_hours as number } : null,
    status: r.status as PlanStatus,
    rejectReason: (r.reject_reason as string | null) ?? null,
    updatedAt: r.updated_at as string,
  };
}

export type OptimizeResult =
  | { ok: true; plan: Plan }
  | { ok: true; infeasible: true; requiredHours: number; budgetHours: number }
  | { ok: false; status: 404 | 409; error: string };

/** FR-028: 최신 시뮬레이션으로 최적화해 `초안`으로 저장한다. 승인된 계획은 바꾸지 않는다. */
export function optimizeAndSave(vesselId: string, budgetHours: number): OptimizeResult {
  const conn = db();
  return conn.transaction((): OptimizeResult => {
    const run = latestRun(vesselId);
    if (!run) return { ok: false, status: 404, error: 'no_simulation' };
    const existing = getPlan(vesselId);
    if (existing?.status === 'approved') return { ok: false, status: 409, error: 'locked' };
    const result = optimize(vesselId, run.rows, budgetHours);
    if (!result.feasible) return { ok: true, infeasible: true, requiredHours: result.requiredHours, budgetHours };
    const now = new Date().toISOString();
    conn.prepare('DELETE FROM inspection_plans WHERE vessel_id = ?').run(vesselId);
    conn.prepare(`INSERT INTO inspection_plans (plan_id, vessel_id, run_id, budget_hours, items, excluded, total_hours, coverage_pct,
      mandatory_count, port_call_id, status, reject_reason, requested_by, decided_by, decided_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NULL, NULL, NULL, NULL, ?)`)
      .run(`PLAN-${vesselId}`, vesselId, run.runId, budgetHours, JSON.stringify(result.items), JSON.stringify(result.excluded),
        result.totalHours, result.coveragePct, result.mandatoryCount, result.port?.portCallId ?? null, now);
    return { ok: true, plan: getPlan(vesselId)! };
  })();
}

export type Transition = 'request' | 'approve' | 'reject';
const NEXT: Record<Transition, { from: PlanStatus[]; to: PlanStatus; audit: string }> = {
  request: { from: ['draft', 'rejected'], to: 'review_requested', audit: 'plan.request' },
  approve: { from: ['review_requested'], to: 'approved', audit: 'plan.approve' },
  reject: { from: ['review_requested'], to: 'rejected', audit: 'plan.reject' },
};

export type TransitionResult = { ok: true; plan: Plan } | { ok: false; status: 400 | 404 | 409; error: string };

/** FR-031 상태 전이. 역할 검사는 API에서 한다. */
export function transition(vesselId: string, action: Transition, actor: string, reason?: string): TransitionResult {
  const conn = db();
  return conn.transaction((): TransitionResult => {
    const plan = getPlan(vesselId);
    if (!plan) return { ok: false, status: 404, error: 'not_found' };
    const rule = NEXT[action];
    if (!rule.from.includes(plan.status)) return { ok: false, status: 409, error: 'invalid_transition' };
    const text = (reason ?? '').trim();
    if (action === 'reject' && (text.length < 5 || text.length > 200)) return { ok: false, status: 400, error: 'invalid_reason' };
    const now = new Date().toISOString();
    if (action === 'request') {
      conn.prepare('UPDATE inspection_plans SET status = ?, requested_by = ?, updated_at = ? WHERE vessel_id = ?')
        .run(rule.to, actor, now, vesselId);
    } else {
      conn.prepare('UPDATE inspection_plans SET status = ?, reject_reason = ?, decided_by = ?, decided_at = ?, updated_at = ? WHERE vessel_id = ?')
        .run(rule.to, action === 'reject' ? text : null, actor, now, now, vesselId);
    }
    conn.prepare('INSERT INTO audit_log (audit_id, actor, action, target, before, after, at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      randomBytes(8).toString('hex'), actor, rule.audit, plan.planId,
      JSON.stringify({ status: plan.status }),
      JSON.stringify(action === 'reject' ? { status: rule.to, rejectReason: text } : { status: rule.to }), now,
    );
    return { ok: true, plan: getPlan(vesselId)! };
  })();
}
