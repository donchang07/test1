import 'server-only';
import { db } from './db';
import type { Grade } from './queries';

// PRD 11.4 계산 계약(예측·시뮬레이션·최적화). 테스트 오라클(tests/reference)과 독립적으로 구현한다.

export type Route = 'calm' | 'moderate' | 'harsh';
export const ROUTE_LABELS: Record<Route, string> = { calm: '온화', moderate: '보통', harsh: '황천' };
export const HORIZONS = [1, 3, 5] as const;

export type ModelParams = {
  allowableDiminutionPct: number;
  findingFactorPerSeverity: number;
  defaultCorrosionRateMmPerYear: number;
  routeSeverityMultipliers: Record<Route, number>;
  riskThresholds: { high: number; medium: number };
  defaultBudgetHours: number;
};

export type Member = {
  memberId: string; vesselId: string; zone: string; name: string;
  originalThicknessMm: number; criticality: number; inspectionHours: number;
};
type Measurement = { memberId: string; surveyDate: string; thicknessMm: number };
type Confirmed = { memberId: string; humanLabel: string; humanSeverity: number | null };
type Fatigue = { memberId: string; fatigueUsage: number; fatigueRatePerYear: number };

export type Forecast = {
  memberId: string; name: string; zone: string; originalThicknessMm: number;
  lastThicknessMm: number; lastSurveyDate: string; renewalThicknessMm: number;
  rate: number; factor: number; renewalYear: number | null; insufficient: boolean;
  measurements: Measurement[]; crackConfirmed: boolean;
  /** 계산용 원값(반올림 전) */
  raw: { rate: number; lastYear: number; renewal: number };
};

export type SimRow = {
  memberId: string; name: string; zone: string; tPred: number; ci: number; fatigue: number; pof: number;
  criticality: number; risk: number; grade: Grade; crack: boolean;
};
export type SimCounts = { high: number; medium: number; low: number };

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 11.4.2 소수 연도: 연도 + (1월 1일부터 경과 일수)/(그해 일수) */
export function decimalYear(date: string): number {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  const days = (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000;
  const yearDays = (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / 86_400_000;
  return y + days / yearDays;
}

function slope(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i += 1) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  return sxx === 0 ? 0 : sxy / sxx;
}

export function currentModelParams(): ModelParams {
  const row = db().prepare('SELECT params FROM model_parameters WHERE id = 1').get() as { params: string };
  return JSON.parse(row.params);
}

export function asOf(): string {
  return (db().prepare('SELECT as_of_date FROM app_meta WHERE id = 1').get() as { as_of_date: string }).as_of_date;
}

export function vesselMembers(vesselId: string): Member[] {
  return (db().prepare(`SELECT member_id, vessel_id, zone, name, original_thickness_mm, criticality, inspection_hours
    FROM members WHERE vessel_id = ? ORDER BY member_id`).all(vesselId) as Array<Record<string, unknown>>).map((r) => ({
    memberId: r.member_id as string,
    vesselId: r.vessel_id as string,
    zone: r.zone as string,
    name: r.name as string,
    originalThicknessMm: r.original_thickness_mm as number,
    criticality: r.criticality as number,
    inspectionHours: r.inspection_hours as number,
  }));
}

/** 11.4.2 부재별 예측. 사람 확정(confirmed) 판정만 반영한다. */
export function forecastVessel(vesselId: string, params: ModelParams = currentModelParams()): Forecast[] {
  const conn = db();
  const members = vesselMembers(vesselId);
  const measurements = conn.prepare(`SELECT t.member_id, t.survey_date, t.thickness_mm FROM thickness_measurements t
    JOIN members m ON m.member_id = t.member_id WHERE m.vessel_id = ? ORDER BY t.survey_date, t.measurement_id`)
    .all(vesselId) as Array<{ member_id: string; survey_date: string; thickness_mm: number }>;
  const confirmed = conn.prepare(`SELECT member_id, human_label, human_severity FROM findings
    WHERE vessel_id = ? AND human_decision = 'confirmed'`).all(vesselId) as
    Array<{ member_id: string; human_label: string; human_severity: number | null }>;

  return members.map((m) => {
    const ms: Measurement[] = measurements.filter((t) => t.member_id === m.memberId)
      .map((t) => ({ memberId: t.member_id, surveyDate: t.survey_date, thicknessMm: t.thickness_mm }));
    const last = ms[ms.length - 1];
    const lastYear = decimalYear(last.surveyDate);
    const insufficient = ms.length < 2;
    const r0 = insufficient
      ? params.defaultCorrosionRateMmPerYear
      : Math.max(0, -slope(ms.map((x) => decimalYear(x.surveyDate)), ms.map((x) => x.thicknessMm)));
    const mine: Confirmed[] = confirmed.filter((f) => f.member_id === m.memberId)
      .map((f) => ({ memberId: f.member_id, humanLabel: f.human_label, humanSeverity: f.human_severity }));
    const severity = mine
      .filter((f) => f.humanLabel === 'corrosion' || f.humanLabel === 'coating_breakdown')
      .reduce((s, f) => Math.max(s, f.humanSeverity ?? 0), 0);
    const factor = 1 + params.findingFactorPerSeverity * severity;
    const rate = r0 * factor;
    const renewal = m.originalThicknessMm * (1 - params.allowableDiminutionPct / 100);
    const year = rate === 0 ? null : lastYear + (last.thicknessMm - renewal) / rate;
    return {
      memberId: m.memberId,
      name: m.name,
      zone: m.zone,
      originalThicknessMm: m.originalThicknessMm,
      lastThicknessMm: last.thicknessMm,
      lastSurveyDate: last.surveyDate,
      renewalThicknessMm: round(renewal, 2),
      rate: round(rate, 3),
      factor: round(factor, 2),
      renewalYear: year === null ? null : Math.floor(Math.max(year, lastYear) * 10) / 10,
      insufficient,
      measurements: ms,
      crackConfirmed: mine.some((f) => f.humanLabel === 'crack'),
      raw: { rate, lastYear, renewal },
    };
  });
}

export function gradeOf(risk: number, params: ModelParams): Grade {
  if (risk >= params.riskThresholds.high) return 'high';
  if (risk >= params.riskThresholds.medium) return 'medium';
  return 'low';
}

/** 위험점수 내림차순, 같으면 memberId 오름차순 */
export const byRisk = (a: { risk: number; memberId: string }, b: { risk: number; memberId: string }) =>
  b.risk - a.risk || a.memberId.localeCompare(b.memberId);

/** 11.4.3 시나리오 시뮬레이션 */
export function simulate(vesselId: string, horizonYears: number, route: Route, params: ModelParams = currentModelParams()) {
  const s = params.routeSeverityMultipliers[route];
  const asOfYear = decimalYear(asOf());
  const fatigue = db().prepare(`SELECT f.member_id, f.fatigue_usage, f.fatigue_rate_per_year FROM fatigue_records f
    JOIN members m ON m.member_id = f.member_id WHERE m.vessel_id = ?`).all(vesselId) as
    Array<{ member_id: string; fatigue_usage: number; fatigue_rate_per_year: number }>;
  const fatigueOf = new Map<string, Fatigue>(fatigue.map((f) => [f.member_id,
    { memberId: f.member_id, fatigueUsage: f.fatigue_usage, fatigueRatePerYear: f.fatigue_rate_per_year }]));
  const members = new Map(vesselMembers(vesselId).map((m) => [m.memberId, m]));

  const rows: SimRow[] = forecastVessel(vesselId, params).map((fc) => {
    const m = members.get(fc.memberId)!;
    const elapsed = asOfYear + horizonYears - fc.raw.lastYear;
    const tPred = fc.lastThicknessMm - fc.raw.rate * s * elapsed;
    const ci = clamp((tPred - fc.raw.renewal) / (m.originalThicknessMm - fc.raw.renewal), 0, 1);
    const f = fatigueOf.get(fc.memberId) ?? { fatigueUsage: 0, fatigueRatePerYear: 0 };
    const d = clamp(f.fatigueUsage + f.fatigueRatePerYear * s * horizonYears, 0, 1);
    const pof = fc.crackConfirmed ? 1 : Math.max(1 - ci, d);
    const risk = Math.round((pof * m.criticality / 3) * 100);
    return {
      memberId: fc.memberId, name: m.name, zone: m.zone,
      tPred: round(tPred, 2), ci: round(ci, 2), fatigue: round(d, 2), pof: round(pof, 2),
      criticality: m.criticality, risk, grade: gradeOf(risk, params), crack: fc.crackConfirmed,
    };
  }).sort(byRisk);

  const counts: SimCounts = { high: 0, medium: 0, low: 0 };
  for (const r of rows) counts[r.grade] += 1;
  return { rows, counts };
}

export type PlanItem = { memberId: string; name: string; risk: number; grade: Grade; hours: number; reason: 'mandatory' | 'efficiency' };
export type PortCall = { portCallId: string; port: string; eta: string; dwellHours: number };
export type Optimized =
  | { feasible: false; requiredHours: number }
  | {
    feasible: true; items: PlanItem[]; excluded: PlanItem[]; totalHours: number; coveragePct: number;
    mandatoryCount: number; port: PortCall | null;
  };

/** 11.4.4 예산 내 검사 계획 */
export function optimize(vesselId: string, rows: SimRow[], budgetHours: number): Optimized {
  const hoursOf = new Map(vesselMembers(vesselId).map((m) => [m.memberId, m.inspectionHours]));
  const all = rows.map((r) => ({ memberId: r.memberId, name: r.name, risk: r.risk, grade: r.grade, hours: hoursOf.get(r.memberId) ?? 0 }));
  const mandatory = all.filter((i) => i.grade === 'high');
  const required = mandatory.reduce((s, i) => s + i.hours, 0);
  if (required > budgetHours) return { feasible: false, requiredHours: round(required, 2) };

  const items: PlanItem[] = mandatory.map((i) => ({ ...i, reason: 'mandatory' }));
  let used = required;
  const optional = all.filter((i) => i.grade !== 'high')
    .sort((a, b) => b.risk / b.hours - a.risk / a.hours || b.risk - a.risk || a.memberId.localeCompare(b.memberId));
  for (const i of optional) {
    if (i.risk > 0 && used + i.hours <= budgetHours) {
      items.push({ ...i, reason: 'efficiency' });
      used += i.hours;
    }
  }
  const chosen = new Set(items.map((i) => i.memberId));
  const totalRisk = all.reduce((s, i) => s + i.risk, 0);
  const covered = items.reduce((s, i) => s + i.risk, 0);
  const port = db().prepare(`SELECT port_call_id, port, eta, dwell_hours FROM port_calls
    WHERE vessel_id = ? AND eta > ? AND inspector_available = 1 AND dwell_hours >= ?
    ORDER BY eta, port_call_id LIMIT 1`).get(vesselId, asOf(), used) as
    { port_call_id: string; port: string; eta: string; dwell_hours: number } | undefined;
  return {
    feasible: true,
    items: items.sort(byRisk),
    excluded: all.filter((i) => !chosen.has(i.memberId)).map((i) => ({ ...i, reason: 'efficiency' as const })).sort(byRisk),
    totalHours: round(used, 2),
    coveragePct: totalRisk === 0 ? 100 : Math.round((covered / totalRisk) * 1000) / 10,
    mandatoryCount: mandatory.length,
    port: port ? { portCallId: port.port_call_id, port: port.port, eta: port.eta, dwellHours: port.dwell_hours } : null,
  };
}
