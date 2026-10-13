import 'server-only';
import { db } from './db';
import { currentModelParams, simulate, type ModelParams, type Route, type SimCounts, type SimRow } from './model';

// DATA-009 시뮬레이션 실행 저장·조회(FR-024, FR-027). 결과에는 사용한 파라미터 스냅샷을 함께 저장한다(FR-033).

export type SimRun = {
  runId: string; vesselId: string; horizonYears: number; route: Route; createdAt: string;
  params: ModelParams; rows: SimRow[]; counts: SimCounts;
};

type Row = { run_id: string; vessel_id: string; horizon_years: number; route: Route; params_snapshot: string; results: string; counts: string; created_at: string };
const toRun = (r: Row): SimRun => ({
  runId: r.run_id, vesselId: r.vessel_id, horizonYears: r.horizon_years, route: r.route, createdAt: r.created_at,
  params: JSON.parse(r.params_snapshot), rows: JSON.parse(r.results), counts: JSON.parse(r.counts),
});

/** I-5: SIM-{vesselId}-{yyyyMMddHHmmss}-{순번} (UTC) */
function runIdFor(vesselId: string, at: Date): string {
  const stamp = at.toISOString().replace(/\D/g, '').slice(0, 14);
  const prefix = `SIM-${vesselId}-${stamp}-`;
  const n = (db().prepare('SELECT COUNT(*) AS n FROM simulation_runs WHERE run_id LIKE ?').get(`${prefix}%`) as { n: number }).n;
  return `${prefix}${n + 1}`;
}

export function runSimulation(vesselId: string, horizonYears: number, route: Route, actor: string): SimRun {
  const conn = db();
  return conn.transaction(() => {
    const params = currentModelParams();
    const { rows, counts } = simulate(vesselId, horizonYears, route, params);
    const at = new Date();
    const runId = runIdFor(vesselId, at);
    conn.prepare(`INSERT INTO simulation_runs (run_id, vessel_id, horizon_years, route, params_snapshot, results, counts, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(runId, vesselId, horizonYears, route, JSON.stringify(params), JSON.stringify(rows), JSON.stringify(counts), actor, at.toISOString());
    return { runId, vesselId, horizonYears, route, createdAt: at.toISOString(), params, rows, counts };
  })();
}

const ORDER = 'ORDER BY created_at DESC, run_id DESC';

export function recentRuns(vesselId: string, limit = 5): SimRun[] {
  return (db().prepare(`SELECT * FROM simulation_runs WHERE vessel_id = ? ${ORDER} LIMIT ?`).all(vesselId, limit) as Row[]).map(toRun);
}

export function latestRun(vesselId: string): SimRun | null {
  return recentRuns(vesselId, 1)[0] ?? null;
}

export function getRun(vesselId: string, runId: string): SimRun | null {
  const row = db().prepare('SELECT * FROM simulation_runs WHERE vessel_id = ? AND run_id = ?').get(vesselId, runId) as Row | undefined;
  return row ? toRun(row) : null;
}
