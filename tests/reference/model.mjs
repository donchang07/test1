// KR Smart RBI 기준 계산 모델(오라클).
// docs/PRD.md 11.4절 계산 계약을 그대로 옮긴 순수 함수다. 앱 구현이 아니라
// 단위 테스트와 E2E 테스트가 기대값을 계산할 때 쓴다. 계약이 바뀌면 이 파일과 PRD를 함께 고친다.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROUTE_LABELS = { calm: '온화', moderate: '보통', harsh: '황천' };
export const GRADE_LABELS = { high: '높음', medium: '중간', low: '낮음' };

export function loadSeed(dir = 'data/seed') {
  const read = (name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
  return {
    meta: read('meta.json'),
    users: read('users.json'),
    vessels: read('vessels.json'),
    members: read('members.json'),
    measurements: read('thickness-measurements.json'),
    fatigue: read('fatigue-records.json'),
    images: read('inspection-images.json'),
    findings: read('findings.json'),
    portCalls: read('port-calls.json'),
    params: read('model-parameters.json'),
  };
}

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// 날짜(YYYY-MM-DD)를 소수 연도로 바꾼다. 1월 1일 = 연도.0
export function decimalYear(date) {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  const start = Date.UTC(y, 0, 1);
  const dayIndex = (Date.UTC(y, m - 1, d) - start) / 86400000;
  return y + dayIndex / (isLeap(y) ? 366 : 365);
}

export function olsSlope(points) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  const sxx = points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  const sxy = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  return sxx === 0 ? 0 : sxy / sxx;
}

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function confirmedFindings(findings, memberId) {
  return findings.filter((f) => f.memberId === memberId && f.humanDecision === 'confirmed');
}

// FR-012~FR-014: 부재별 부식 속도와 교체 도달 연도
export function forecastMember(member, data, params = data.params) {
  const ms = data.measurements
    .filter((m) => m.memberId === member.memberId)
    .sort((a, b) => a.surveyDate.localeCompare(b.surveyDate));
  const last = ms[ms.length - 1];
  const lastYear = decimalYear(last.surveyDate);
  const sparse = ms.length < 2;
  const baseRate = sparse
    ? params.defaultCorrosionRateMmPerYear
    : Math.max(0, -olsSlope(ms.map((m) => ({ x: decimalYear(m.surveyDate), y: m.thicknessMm }))));

  const confirmed = confirmedFindings(data.findings, member.memberId);
  const corrosionSeverity = Math.max(0, ...confirmed
    .filter((f) => f.humanLabel === 'corrosion' || f.humanLabel === 'coating_breakdown')
    .map((f) => f.humanSeverity));
  const factor = 1 + params.findingFactorPerSeverity * corrosionSeverity;
  const rate = baseRate * factor;
  const renewalThickness = member.originalThicknessMm * (1 - params.allowableDiminutionPct / 100);
  const yearsToRenewal = rate === 0 ? Infinity : (last.thicknessMm - renewalThickness) / rate;
  const renewalYear = yearsToRenewal === Infinity ? null : lastYear + yearsToRenewal;

  return {
    memberId: member.memberId,
    lastThicknessMm: last.thicknessMm,
    lastSurveyDate: last.surveyDate,
    renewalThicknessMm: r2(renewalThickness),
    baseRateMmPerYear: r3(baseRate),
    findingFactor: r2(factor),
    rateMmPerYear: r3(rate),
    // 이미 기준 이하이면 마지막 실측 연도를 표시한다.
    renewalYear: renewalYear === null ? null : Math.floor(Math.max(renewalYear, lastYear) * 10) / 10,
    dataStatus: sparse ? 'insufficient' : 'ok',
    hasConfirmedCrack: confirmed.some((f) => f.humanLabel === 'crack'),
    _raw: { rate, lastYear, renewalThickness },
  };
}

export function gradeOf(risk, params) {
  if (risk >= params.riskThresholds.high) return 'high';
  if (risk >= params.riskThresholds.medium) return 'medium';
  return 'low';
}

// FR-017~FR-019: 시나리오 시뮬레이션
export function simulateVessel(vesselId, { horizonYears, route }, data, params = data.params) {
  const s = params.routeSeverityMultipliers[route];
  const asOfYear = decimalYear(data.meta.asOfDate);
  const rows = data.members
    .filter((m) => m.vesselId === vesselId)
    .map((member) => {
      const fc = forecastMember(member, data, params);
      const elapsed = asOfYear + horizonYears - fc._raw.lastYear;
      const tPred = fc.lastThicknessMm - fc._raw.rate * s * elapsed;
      const span = member.originalThicknessMm - fc._raw.renewalThickness;
      const ci = clamp((tPred - fc._raw.renewalThickness) / span, 0, 1);
      const fat = data.fatigue.find((f) => f.memberId === member.memberId);
      const dPred = clamp(fat.fatigueUsage + fat.fatigueRatePerYear * s * horizonYears, 0, 1);
      const pof = fc.hasConfirmedCrack ? 1 : Math.max(1 - ci, dPred);
      const risk = Math.round((pof * member.criticality / 3) * 100);
      return {
        memberId: member.memberId,
        predictedThicknessMm: r2(tPred),
        conditionIndex: r2(ci),
        fatigueUsage: r2(dPred),
        pof: r2(pof),
        criticality: member.criticality,
        risk,
        grade: gradeOf(risk, params),
        crackConfirmed: fc.hasConfirmedCrack,
      };
    });
  const counts = { high: 0, medium: 0, low: 0 };
  rows.forEach((r) => { counts[r.grade] += 1; });
  const top = [...rows].sort((a, b) => b.risk - a.risk || a.memberId.localeCompare(b.memberId))[0];
  return { vesselId, horizonYears, route, rows, counts, topMemberId: top.memberId };
}

// FR-022~FR-025: 검사 계획 최적화
export function optimizePlan(sim, budgetHours, data) {
  const membersById = Object.fromEntries(data.members.map((m) => [m.memberId, m]));
  const items = sim.rows.map((r) => ({ ...r, hours: membersById[r.memberId].inspectionHours }));
  const mandatory = items.filter((i) => i.grade === 'high');
  const mandatoryHours = mandatory.reduce((s, i) => s + i.hours, 0);
  if (mandatoryHours > budgetHours) {
    return { feasible: false, requiredHours: mandatoryHours, budgetHours };
  }
  const selected = mandatory.map((i) => ({ ...i, reason: 'mandatory' }));
  let used = mandatoryHours;
  const optional = items
    .filter((i) => i.grade !== 'high')
    .sort((a, b) => (b.risk / b.hours) - (a.risk / a.hours) || b.risk - a.risk || a.memberId.localeCompare(b.memberId));
  for (const item of optional) {
    if (item.risk > 0 && used + item.hours <= budgetHours) {
      selected.push({ ...item, reason: 'efficiency' });
      used += item.hours;
    }
  }
  const selectedIds = new Set(selected.map((i) => i.memberId));
  const totalRisk = items.reduce((s, i) => s + i.risk, 0);
  const coveredRisk = selected.reduce((s, i) => s + i.risk, 0);
  const port = data.portCalls
    .filter((p) => p.vesselId === sim.vesselId && p.eta > data.meta.asOfDate
      && p.inspectorAvailable && p.dwellHours >= used)
    .sort((a, b) => a.eta.localeCompare(b.eta))[0] ?? null;
  return {
    feasible: true,
    budgetHours,
    totalHours: r2(used),
    selected,
    excluded: items.filter((i) => !selectedIds.has(i.memberId)),
    mandatoryCount: mandatory.length,
    coveragePct: totalRisk === 0 ? 100 : Math.round((coveredRisk / totalRisk) * 1000) / 10,
    port,
  };
}
