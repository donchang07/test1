// 합성 데이터와 기준 계산 모델(오라클)이 PRD 계약과 시나리오를 지키는지 확인한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadSeed, decimalYear, forecastMember, simulateVessel, optimizePlan,
} from '../reference/model.mjs';

const data = loadSeed();
const { scenarios } = data.meta;

test('생성기는 같은 시드로 같은 데이터를 만든다', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rbi-seed-'));
  execFileSync('node', [
    'scripts/generate-synthetic-data.mjs', '--out', join(dir, 'seed'), '--images', join(dir, 'img'),
  ]);
  for (const name of readdirSync('data/seed')) {
    assert.equal(
      readFileSync(join(dir, 'seed', name), 'utf8'),
      readFileSync(join('data/seed', name), 'utf8'),
      `${name}이 커밋된 시드와 다르다. 생성기를 다시 실행해 data/seed를 갱신할 것`,
    );
  }
});

test('참조 무결성: 모든 외래 키가 존재한다', () => {
  const vesselIds = new Set(data.vessels.map((v) => v.vesselId));
  const memberIds = new Set(data.members.map((m) => m.memberId));
  const imageIds = new Set(data.images.map((i) => i.imageId));
  data.members.forEach((m) => assert.ok(vesselIds.has(m.vesselId), m.memberId));
  data.measurements.forEach((m) => assert.ok(memberIds.has(m.memberId), m.measurementId));
  data.fatigue.forEach((f) => assert.ok(memberIds.has(f.memberId), f.memberId));
  data.findings.forEach((f) => {
    assert.ok(imageIds.has(f.imageId), f.findingId);
    assert.ok(memberIds.has(f.memberId), f.findingId);
  });
  data.portCalls.forEach((p) => assert.ok(vesselIds.has(p.vesselId), p.portCallId));
  assert.equal(data.members.length, data.vessels.length * 16);
  assert.equal(data.fatigue.length, data.members.length);
});

test('두께는 측정 순서대로 증가하지 않고 원설계 두께 이하이다', () => {
  for (const member of data.members) {
    const ms = data.measurements.filter((m) => m.memberId === member.memberId)
      .sort((a, b) => a.surveyDate.localeCompare(b.surveyDate));
    assert.ok(ms.length >= 1);
    ms.forEach((m, i) => {
      assert.ok(m.thicknessMm <= member.originalThicknessMm, m.measurementId);
      if (i > 0) assert.ok(m.thicknessMm <= ms[i - 1].thicknessMm, m.measurementId);
    });
  }
});

test('실데이터 식별자와 비밀번호 값을 담지 않는다', () => {
  data.vessels.forEach((v) => {
    assert.match(v.vesselId, /^KR-SYN-\d{3}$/);
    assert.equal(v.dataLabel, '합성');
  });
  data.users.forEach((u) => {
    assert.match(u.email, /@synthetic\.example$/);
    assert.equal('password' in u, false);
    assert.match(u.passwordEnv, /^SEED_[A-Z_]+_PASSWORD$/);
  });
});

test('decimalYear는 1월 1일을 정수 연도로 본다', () => {
  assert.equal(decimalYear('2026-01-01'), 2026);
  assert.ok(Math.abs(decimalYear('2024-07-01') - (2024 + 182 / 366)) < 1e-12);
});

test('시나리오: 실측 1회 부재는 데이터 부족과 기본 부식 속도를 쓴다', () => {
  const m = data.members.find((x) => x.memberId === scenarios.sparseVessel.memberId);
  const fc = forecastMember(m, data);
  assert.equal(fc.dataStatus, 'insufficient');
  assert.equal(fc.baseRateMmPerYear, data.params.defaultCorrosionRateMmPerYear);
});

test('시나리오: 판독 확정 시 부식 속도 보정계수가 반영된다', () => {
  const finding = data.findings.find((f) => f.vesselId === 'KR-SYN-010' && f.aiLabel === 'corrosion');
  const member = data.members.find((m) => m.memberId === finding.memberId);
  const before = forecastMember(member, data);
  const confirmed = {
    ...data,
    findings: data.findings.map((f) => (f.findingId === finding.findingId
      ? { ...f, humanDecision: 'confirmed', humanLabel: 'corrosion', humanSeverity: 2 } : f)),
  };
  const after = forecastMember(member, confirmed);
  assert.equal(after.findingFactor, 1.4);
  assert.ok(after.rateMmPerYear > before.rateMmPerYear);
});

test('시나리오: 균열을 확정하면 해당 부재 위험은 100점·높음이다', () => {
  const { vesselId, memberId } = scenarios.crackVessel;
  const crack = data.findings.find((f) => f.memberId === memberId && f.aiLabel === 'crack');
  assert.ok(crack, '균열 의심 AI 판독이 시드에 있어야 한다');
  const before = simulateVessel(vesselId, { horizonYears: 3, route: 'moderate' }, data)
    .rows.find((r) => r.memberId === memberId);
  assert.ok(before.risk < 100);
  const confirmed = {
    ...data,
    findings: data.findings.map((f) => (f.findingId === crack.findingId
      ? { ...f, humanDecision: 'confirmed', humanLabel: 'crack', humanSeverity: 3 } : f)),
  };
  const after = simulateVessel(vesselId, { horizonYears: 3, route: 'moderate' }, confirmed)
    .rows.find((r) => r.memberId === memberId);
  assert.equal(after.risk, 100);
  assert.equal(after.grade, 'high');
});

test('시뮬레이션: 해상 조건이 거칠수록 위험 점수가 줄지 않는다', () => {
  for (const v of data.vessels) {
    const calm = simulateVessel(v.vesselId, { horizonYears: 3, route: 'calm' }, data);
    const harsh = simulateVessel(v.vesselId, { horizonYears: 3, route: 'harsh' }, data);
    calm.rows.forEach((row, i) => assert.ok(harsh.rows[i].risk >= row.risk, row.memberId));
  }
});

test('최적화: 고위험 부재는 모두 포함되고 예산을 넘지 않는다', () => {
  for (const v of data.vessels) {
    const sim = simulateVessel(v.vesselId, { horizonYears: 5, route: 'harsh' }, data);
    const plan = optimizePlan(sim, data.params.defaultBudgetHours, data);
    assert.ok(plan.feasible, v.vesselId);
    assert.ok(plan.totalHours <= data.params.defaultBudgetHours);
    const high = sim.rows.filter((r) => r.grade === 'high').map((r) => r.memberId);
    const selected = new Set(plan.selected.map((s) => s.memberId));
    high.forEach((id) => assert.ok(selected.has(id), id));
  }
});

test('시나리오: 필수 시간이 예산을 넘으면 계획을 만들지 않는다', () => {
  const sim = simulateVessel(scenarios.infeasibleVessel.vesselId, { horizonYears: 5, route: 'harsh' }, data);
  const plan = optimizePlan(sim, 10, data);
  assert.equal(plan.feasible, false);
  assert.ok(plan.requiredHours > 10);
});

test('시나리오: 적합 기항지가 없는 선박은 port가 null이다', () => {
  const sim = simulateVessel(scenarios.noPortVessel.vesselId, { horizonYears: 3, route: 'moderate' }, data);
  assert.equal(optimizePlan(sim, 40, data).port, null);
});

test('시나리오: 이미지 없는 선박·AI 실패 이미지·검토 완료 판독이 있다', () => {
  assert.equal(data.images.filter((i) => i.vesselId === scenarios.noImageVessel.vesselId).length, 0);
  assert.ok(data.images.some((i) => i.vesselId === scenarios.aiFailedVessel.vesselId && i.aiStatus === 'failed'));
  const reviewed = data.findings.filter((f) => f.vesselId === scenarios.reviewedVessel.vesselId);
  assert.ok(reviewed.some((f) => f.humanDecision === 'confirmed'));
  assert.ok(reviewed.some((f) => f.humanDecision === 'rejected'));
});
