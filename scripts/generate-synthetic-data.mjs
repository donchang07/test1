#!/usr/bin/env node
// KR Smart RBI 합성 데이터 생성기.
// 같은 시드로 실행하면 항상 같은 결과를 만든다. 실제 선박·인물·선급 데이터는 포함하지 않는다.
//
// 사용법: node scripts/generate-synthetic-data.mjs [--seed 20261001] [--out data/seed] [--images public/synthetic/inspection]

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, []),
);

const SEED = Number(args.seed ?? 20261001);
const OUT_DIR = args.out ?? 'data/seed';
const IMAGE_DIR = args.images ?? 'public/synthetic/inspection';
const AS_OF = '2026-10-01';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);
const between = (min, max) => min + (max - min) * rand();
const intBetween = (min, max) => Math.floor(between(min, max + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];
const round = (value, digits) => Number(value.toFixed(digits));
const pad = (n, width = 2) => String(n).padStart(width, '0');

const VESSEL_NAMES = [
  'SYN 오로라', 'SYN 보레아스', 'SYN 칼립소', 'SYN 델피니', 'SYN 에코', 'SYN 포르투나',
  'SYN 갈라테아', 'SYN 헬리오스', 'SYN 이리스', 'SYN 주노', 'SYN 케이론', 'SYN 루미나',
];
const SHIP_TYPES = ['벌크선', '유조선', '컨테이너선'];
const PORTS = ['부산', '싱가포르', '로테르담', '상하이', '휴스턴', '두바이', '요코하마', '앤트워프'];

// [구역, 부재 유형, 부재명, 원설계 두께(mm), 중요도(1~3), 검사 소요시간(h)]
const MEMBER_TEMPLATE = [
  ['선수부', '선측 외판', '선수 선측 외판(좌현)', 16, 2, 2],
  ['선수부', '갑판', '선수루 갑판', 12, 1, 1.5],
  ['No.1 화물창', '선저 외판', 'No.1 화물창 선저 외판', 18, 3, 3],
  ['No.1 화물창', '늑골', 'No.1 화물창 늑골 F45', 13, 2, 2.5],
  ['No.2 화물창', '선측 외판', 'No.2 화물창 선측 외판(우현)', 17, 3, 3],
  ['No.2 화물창', '종통재', 'No.2 화물창 선저 종통재 L12', 15, 3, 3.5],
  ['No.3 화물창', '횡격벽', 'No.3 화물창 횡격벽', 14, 2, 3],
  ['No.3 화물창', '늑골', 'No.3 화물창 늑골 F102', 13, 2, 2.5],
  ['No.4 화물창', '선저 외판', 'No.4 화물창 선저 외판', 18, 3, 3],
  ['No.4 화물창', '해치 코밍', 'No.4 화물창 해치 코밍', 15, 2, 2],
  ['상갑판', '갑판', '상갑판 중앙부', 20, 3, 4],
  ['상갑판', '종통재', '상갑판 종통재 L3', 16, 3, 3],
  ['기관실', '선저 외판', '기관실 선저 외판', 17, 2, 3],
  ['기관실', '이중저 탱크', '기관실 이중저 탱크 상판', 14, 2, 2.5],
  ['선미부', '선측 외판', '선미 선측 외판(우현)', 16, 2, 2],
  ['선미부', '타두재 구역', '선미 타두재 구역 외판', 18, 3, 2.5],
];

const SURVEY_DATES = ['2018-07-01', '2021-07-01', '2024-07-01'];

// 테스트가 기대하는 시나리오. 숫자를 바꾸면 tests/unit 기대값도 함께 확인한다.
const SCENARIOS = {
  // 균열 의심 AI 판독이 있는 선박. 확정하면 해당 부재는 위험 100점(높음)이 된다.
  crackVessel: { vesselId: 'KR-SYN-003', memberId: 'KR-SYN-003-M06' },
  // 중요도 3 부재의 부식이 빨라 고위험 부재가 많다. 황천·5년·예산 10시간이면 필수 항목만으로 예산을 넘는다.
  infeasibleVessel: { vesselId: 'KR-SYN-005' },
  // 검사 이미지가 없는 선박(판독 빈 상태).
  noImageVessel: { vesselId: 'KR-SYN-007' },
  // 조건을 만족하는 기항지가 없는 선박.
  noPortVessel: { vesselId: 'KR-SYN-009' },
  // AI 판독 실패 이미지가 있는 선박.
  aiFailedVessel: { vesselId: 'KR-SYN-010' },
  // 실측이 1회뿐인 부재가 있는 선박(데이터 부족 → 기본 부식 속도).
  sparseVessel: { vesselId: 'KR-SYN-012', memberId: 'KR-SYN-012-M01' },
  // 이미 사람이 검토한 판독이 섞여 있는 선박.
  reviewedVessel: { vesselId: 'KR-SYN-002' },
};

function dateAfter(base, days) {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function plateSvg(seedValue, label, failed) {
  const r = mulberry32(seedValue);
  const spots = Array.from({ length: 6 + Math.floor(r() * 8) }, () => {
    const cx = round(20 + r() * 280, 1);
    const cy = round(20 + r() * 180, 1);
    const rx = round(4 + r() * 22, 1);
    const ry = round(3 + r() * 14, 1);
    const tone = ['#8a4b2a', '#a0522d', '#6e3b1f'][Math.floor(r() * 3)];
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${tone}" opacity="${round(0.35 + r() * 0.5, 2)}"/>`;
  }).join('');
  const overlay = failed
    ? '<rect x="0" y="0" width="320" height="220" fill="#000" opacity="0.55"/>'
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220" role="img" aria-label="${label}">`
    + '<rect width="320" height="220" fill="#7d8186"/>'
    + '<path d="M0 72H320M0 148H320M106 0V220M214 0V220" stroke="#5f6368" stroke-width="3"/>'
    + spots + overlay
    + `<text x="10" y="210" font-family="sans-serif" font-size="11" fill="#fff">${label}</text></svg>`;
}

const vessels = [];
const members = [];
const measurements = [];
const fatigue = [];
const images = [];
const findings = [];
const portCalls = [];

for (let v = 1; v <= 12; v += 1) {
  const vesselId = `KR-SYN-${pad(v, 3)}`;
  const builtYear = intBetween(2008, 2016);
  const shipType = SHIP_TYPES[(v - 1) % SHIP_TYPES.length];
  vessels.push({
    vesselId,
    name: VESSEL_NAMES[v - 1],
    shipType,
    builtYear,
    grossTonnage: intBetween(28, 160) * 1000,
    classNotation: `KRS1 합성-${shipType}`,
    nextSpecialSurveyDue: dateAfter(AS_OF, intBetween(60, 900)),
    dataLabel: '합성',
  });

  MEMBER_TEMPLATE.forEach(([zone, memberType, name, t0, criticality, inspectionHours], index) => {
    const memberId = `${vesselId}-M${pad(index + 1)}`;
    members.push({
      memberId, vesselId, zone, memberType, name,
      originalThicknessMm: t0, criticality, inspectionHours,
    });

    let rate = between(0.03, 0.16);
    if (vesselId === SCENARIOS.infeasibleVessel.vesselId && criticality === 3) rate = between(0.34, 0.42);
    if (vesselId === 'KR-SYN-001' && index === 2) rate = 0.38;

    const sparse = memberId === SCENARIOS.sparseVessel.memberId;
    const dates = sparse ? [SURVEY_DATES[2]] : SURVEY_DATES;
    let last = Infinity;
    dates.forEach((date, k) => {
      const years = Number(date.slice(0, 4)) + 0.5 - builtYear;
      const noise = between(-0.04, 0.04);
      const value = Math.min(last, round(t0 - rate * years + noise, 2));
      last = value;
      measurements.push({
        measurementId: `${memberId}-T${k + 1}`,
        memberId,
        surveyDate: date,
        thicknessMm: value,
        source: '합성 두께 계측',
      });
    });

    fatigue.push({
      memberId,
      asOfDate: AS_OF,
      fatigueUsage: round(between(0.05, 0.45), 3),
      fatigueRatePerYear: round(between(0.01, 0.06), 3),
      source: '합성 선체 응력 센서 요약',
    });
  });

  if (vesselId !== SCENARIOS.noImageVessel.vesselId) {
    const imageCount = intBetween(4, 7);
    const vesselMembers = members.filter((m) => m.vesselId === vesselId);
    for (let i = 1; i <= imageCount; i += 1) {
      const imageId = `${vesselId}-IMG${pad(i)}`;
      const member = pick(vesselMembers);
      const failed = vesselId === SCENARIOS.aiFailedVessel.vesselId && i === 1;
      const file = `${imageId}.svg`;
      images.push({
        imageId,
        vesselId,
        memberId: member.memberId,
        capturedAt: dateAfter('2026-08-01', intBetween(0, 45)),
        captureMethod: pick(['드론', '원격 카메라', '검사원 촬영']),
        imagePath: `/synthetic/inspection/${file}`,
        aiStatus: failed ? 'failed' : 'completed',
        aiModelVersion: 'synthetic-vision-0.1',
        _svg: plateSvg(SEED + v * 100 + i, `${imageId} (합성)`, failed),
        _file: file,
      });
      if (failed) {
        findings.push(baseFinding(`${imageId}-F1`, imageId, vesselId, member.memberId, null, null, null, 'failed'));
        continue;
      }
      const findingCount = intBetween(1, 2);
      for (let f = 1; f <= findingCount; f += 1) {
        const label = pick(['corrosion', 'corrosion', 'coating_breakdown', 'none']);
        findings.push(baseFinding(
          `${imageId}-F${f}`, imageId, vesselId, member.memberId,
          label, label === 'none' ? null : intBetween(1, 3), round(between(0.55, 0.98), 2), 'completed',
        ));
      }
    }
  }

  const callCount = 3;
  for (let c = 1; c <= callCount; c += 1) {
    const noPort = vesselId === SCENARIOS.noPortVessel.vesselId;
    portCalls.push({
      portCallId: `${vesselId}-PC${c}`,
      vesselId,
      port: pick(PORTS),
      eta: dateAfter(AS_OF, 7 * c + intBetween(0, 6)),
      dwellHours: noPort ? intBetween(6, 14) : intBetween(18, 72),
      inspectorAvailable: noPort ? c === 1 : rand() > 0.25,
    });
  }
}

function baseFinding(findingId, imageId, vesselId, memberId, aiLabel, aiSeverity, aiConfidence, aiStatus) {
  return {
    findingId, imageId, vesselId, memberId,
    aiStatus, aiLabel, aiSeverity, aiConfidence,
    humanDecision: 'pending',
    humanLabel: null, humanSeverity: null, humanNote: null,
    reviewedBy: null, reviewedAt: null,
  };
}

// 시나리오: 균열 의심 판독을 KR-SYN-003-M06에 추가한다.
{
  const { vesselId, memberId } = SCENARIOS.crackVessel;
  const imageId = `${vesselId}-IMG99`;
  const file = `${imageId}.svg`;
  images.push({
    imageId, vesselId, memberId,
    capturedAt: '2026-09-10', captureMethod: '드론',
    imagePath: `/synthetic/inspection/${file}`,
    aiStatus: 'completed', aiModelVersion: 'synthetic-vision-0.1',
    _svg: plateSvg(SEED + 9999, `${imageId} (합성)`, false), _file: file,
  });
  findings.push(baseFinding(`${imageId}-F1`, imageId, vesselId, memberId, 'crack', 3, 0.91, 'completed'));
}

// 시나리오: KR-SYN-002의 첫 두 판독은 이미 검토되어 있다.
{
  const reviewed = findings.filter((f) => f.vesselId === SCENARIOS.reviewedVessel.vesselId
    && f.aiStatus === 'completed' && f.aiLabel !== 'none');
  if (reviewed[0]) Object.assign(reviewed[0], {
    humanDecision: 'confirmed', humanLabel: reviewed[0].aiLabel,
    humanSeverity: reviewed[0].aiSeverity, reviewedBy: 'inspector1', reviewedAt: '2026-09-20T09:00:00Z',
  });
  if (reviewed[1]) Object.assign(reviewed[1], {
    humanDecision: 'rejected', humanLabel: null, humanSeverity: null,
    humanNote: '용접 비드 반사로 인한 오탐', reviewedBy: 'inspector1', reviewedAt: '2026-09-20T09:05:00Z',
  });
}

const users = [
  { userId: 'inspector1', email: 'inspector1@synthetic.example', displayName: '검사원 A', role: 'inspector', passwordEnv: 'SEED_INSPECTOR_PASSWORD' },
  { userId: 'inspector2', email: 'inspector2@synthetic.example', displayName: '검사원 B', role: 'inspector', passwordEnv: 'SEED_INSPECTOR_PASSWORD' },
  { userId: 'admin1', email: 'admin1@synthetic.example', displayName: '검사기획 관리자', role: 'admin', passwordEnv: 'SEED_ADMIN_PASSWORD' },
];

const modelParameters = {
  version: 1,
  allowableDiminutionPct: 20,
  findingFactorPerSeverity: 0.2,
  defaultCorrosionRateMmPerYear: 0.1,
  routeSeverityMultipliers: { calm: 0.8, moderate: 1.0, harsh: 1.3 },
  riskThresholds: { high: 70, medium: 40 },
  defaultBudgetHours: 40,
  updatedBy: 'seed',
  updatedAt: `${AS_OF}T00:00:00Z`,
};

const meta = {
  generator: 'scripts/generate-synthetic-data.mjs',
  seed: SEED,
  asOfDate: AS_OF,
  notice: '모든 데이터는 합성 데이터이며 실제 선박·선급 기록이 아니다.',
  scenarios: SCENARIOS,
  counts: {
    vessels: vessels.length, members: members.length, measurements: measurements.length,
    images: images.length, findings: findings.length, portCalls: portCalls.length,
  },
};

mkdirSync(OUT_DIR, { recursive: true });
rmSync(IMAGE_DIR, { recursive: true, force: true });
mkdirSync(IMAGE_DIR, { recursive: true });

for (const image of images) writeFileSync(join(IMAGE_DIR, image._file), image._svg);
const cleanImages = images.map(({ _svg, _file, ...rest }) => rest);

const files = {
  'meta.json': meta,
  'users.json': users,
  'vessels.json': vessels,
  'members.json': members,
  'thickness-measurements.json': measurements,
  'fatigue-records.json': fatigue,
  'inspection-images.json': cleanImages,
  'findings.json': findings,
  'port-calls.json': portCalls,
  'model-parameters.json': modelParameters,
  'simulation-runs.json': [],
  'inspection-plans.json': [],
  'audit-log.json': [],
};

for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(OUT_DIR, name), `${JSON.stringify(content, null, 2)}\n`);
}

console.log(`합성 데이터 생성 완료 (seed=${SEED}) → ${OUT_DIR}`);
console.log(meta.counts);
