// feature: inspection-plan — SC-026 ~ SC-032
import { test, expect } from '@playwright/test';
import {
  tid, seed, scenarios, login, resetData, simulateVessel, optimizePlan, forecastMember, withParams,
  GRADE_LABELS, fmt, runSimulation, optimize,
} from './support/app';

test.beforeEach(async ({ request }) => {
  await resetData(request);
});

test('SC-026 최적화 결과가 기준 모델과 일치한다', async ({ page }) => {
  await login(page, 'inspector');
  const vesselId = 'KR-SYN-002';
  await page.goto(`/vessels/${vesselId}/plan`);
  await expect(tid(page, 'SCR-007-EL-02')).toContainText('먼저 시뮬레이션을 실행하세요.');
  await tid(page, 'SCR-007-EL-02', 'link').click();
  await expect(page).toHaveURL(new RegExp(`/vessels/${vesselId}/simulate$`));

  await runSimulation(page, vesselId);
  await page.goto(`/vessels/${vesselId}/plan`);
  await expect(tid(page, 'SCR-007-EL-03')).toHaveValue(String(seed.params.defaultBudgetHours));
  await tid(page, 'SCR-007-EL-04').click();

  const sim = simulateVessel(vesselId, { horizonYears: 3, route: 'moderate' }, seed);
  const plan = optimizePlan(sim, seed.params.defaultBudgetHours, seed);
  if (!plan.feasible) throw new Error('시드 시나리오가 바뀌었다: KR-SYN-002 기본 예산 계획이 가능해야 한다');
  await expect(tid(page, 'SCR-007-EL-06', 'count')).toContainText(`선택 ${plan.selected.length}개`);
  await expect(tid(page, 'SCR-007-EL-06', 'hours')).toContainText(fmt.hours(plan.totalHours));
  await expect(tid(page, 'SCR-007-EL-06', 'coverage')).toContainText(fmt.pct(plan.coveragePct));
  await expect(tid(page, 'SCR-007-EL-06', 'mandatory')).toContainText(`필수 ${plan.mandatoryCount}개`);
  await expect(page.getByTestId(/^SCR-007-EL-07-KR-SYN-002-M\d{2}$/)).toHaveCount(plan.selected.length);
  for (const item of plan.selected) {
    await expect(tid(page, 'SCR-007-EL-07', item.memberId, 'risk')).toHaveText(String(item.risk));
    await expect(tid(page, 'SCR-007-EL-07', item.memberId, 'reason'))
      .toHaveText(item.reason === 'mandatory' ? '필수(고위험)' : '위험 대비 효율');
  }
  await expect(tid(page, 'SCR-007-EL-09')).toContainText(plan.port!.port);
  await expect(tid(page, 'SCR-007-EL-09')).toContainText(plan.port!.eta);
  await expect(tid(page, 'SCR-007-EL-18')).toHaveText('초안');
});

test('SC-027 필수 시간이 예산을 넘으면 계획을 만들지 않는다', async ({ page }) => {
  await login(page, 'inspector');
  const vesselId = scenarios.infeasibleVessel.vesselId;
  await runSimulation(page, vesselId, 5, 'harsh');
  await optimize(page, vesselId, 10);
  const plan = optimizePlan(simulateVessel(vesselId, { horizonYears: 5, route: 'harsh' }, seed), 10, seed);
  expect(plan.feasible).toBe(false);
  await expect(tid(page, 'SCR-007-EL-05')).toContainText(`${fmt.hours(plan.requiredHours)}이 필요해 예산 10시간을 초과합니다`);
  await expect(tid(page, 'SCR-007-EL-06')).toHaveCount(0);
});

test('SC-028 조건에 맞는 기항지가 없으면 경고', async ({ page }) => {
  await login(page, 'inspector');
  const vesselId = scenarios.noPortVessel.vesselId;
  await runSimulation(page, vesselId);
  await optimize(page, vesselId);
  await expect(tid(page, 'SCR-007-EL-10')).toContainText('조건에 맞는 기항지가 없습니다.');
  await expect(tid(page, 'SCR-007-EL-09')).toHaveCount(0);
  await expect(tid(page, 'SCR-007-EL-18')).toHaveText('초안');
});

test('SC-029 예산 입력 검증과 저장 실패', async ({ page, context }) => {
  await login(page, 'inspector');
  await runSimulation(page, 'KR-SYN-001');
  await page.goto('/vessels/KR-SYN-001/plan');
  for (const bad of ['3', '201']) {
    await tid(page, 'SCR-007-EL-03').fill(bad);
    await expect(tid(page, 'SCR-007-EL-03', 'error')).toHaveText('4~200 사이의 정수를 입력하세요.');
    await expect(tid(page, 'SCR-007-EL-04')).toBeDisabled();
  }
  await tid(page, 'SCR-007-EL-03').fill('40');
  await expect(tid(page, 'SCR-007-EL-04')).toBeEnabled();
  await context.setOffline(true);
  await tid(page, 'SCR-007-EL-04').click();
  await expect(tid(page, 'SCR-007-EL-19')).toContainText('저장하지 못했습니다.');
  await expect(tid(page, 'SCR-007-EL-06')).toHaveCount(0);
  await context.setOffline(false);
});

test('SC-030 검토 요청 → 반려 → 재요청 → 승인 → 잠금', async ({ browser }) => {
  const vesselId = 'KR-SYN-001';
  const inspector = await (await browser.newContext()).newPage();
  const admin = await (await browser.newContext()).newPage();
  await login(inspector, 'inspector');
  await login(admin, 'admin');

  await runSimulation(inspector, vesselId);
  await optimize(inspector, vesselId);
  await tid(inspector, 'SCR-007-EL-12').click();
  await expect(tid(inspector, 'SCR-007-EL-18')).toHaveText('검토 요청');
  await expect(tid(inspector, 'SCR-007-EL-13')).toHaveCount(0);
  await expect(tid(inspector, 'SCR-007-EL-14')).toHaveCount(0);

  await admin.goto('/fleet');
  await expect(tid(admin, 'SCR-002-EL-05')).toContainText('1건');
  await admin.goto(`/vessels/${vesselId}/plan`);
  await tid(admin, 'SCR-007-EL-14').click();
  await tid(admin, 'SCR-007-EL-15', 'reason').fill('반려사유');
  await tid(admin, 'SCR-007-EL-16').click();
  await expect(tid(admin, 'SCR-007-EL-15', 'error')).toHaveText('반려 사유를 5자 이상 입력하세요.');
  const reason = '선미 구역 항목 재검토 필요';
  await tid(admin, 'SCR-007-EL-15', 'reason').fill(reason);
  await tid(admin, 'SCR-007-EL-16').click();
  await expect(tid(admin, 'SCR-007-EL-18')).toHaveText('반려됨');

  await inspector.reload();
  await expect(tid(inspector, 'SCR-007-EL-17')).toContainText(reason);
  await tid(inspector, 'SCR-007-EL-12').click();
  await expect(tid(inspector, 'SCR-007-EL-18')).toHaveText('검토 요청');

  await admin.reload();
  await tid(admin, 'SCR-007-EL-13').click();
  await expect(tid(admin, 'SCR-007-EL-18')).toHaveText('승인됨');
  await expect(tid(admin, 'SCR-007-EL-04')).toBeDisabled();
  await expect(tid(admin, 'SCR-007-EL-04', 'locked')).toHaveText('승인된 계획은 변경할 수 없습니다.');
  await admin.goto('/fleet');
  await expect(tid(admin, 'SCR-002-EL-05')).toContainText('0건');
  await expect(tid(admin, 'SCR-002-EL-08', vesselId, 'planStatus')).toHaveText('승인됨');
});

test('SC-031 설정 변경은 이후 계산에만 적용되고 기존 실행 결과는 그대로다', async ({ page }) => {
  await login(page, 'admin');
  const vesselId = 'KR-SYN-001';
  await runSimulation(page, vesselId);
  const before = simulateVessel(vesselId, { horizonYears: 3, route: 'moderate' }, seed);

  await page.goto('/admin/settings');
  await expect(tid(page, 'SCR-008-EL-11')).toContainText('변경 이력이 없습니다.');
  await tid(page, 'SCR-008-EL-01').fill('25');
  await tid(page, 'SCR-008-EL-07').click();
  await expect(tid(page, 'SCR-008-EL-10')).toHaveText('설정을 저장했습니다. 이후 예측과 시뮬레이션에 적용됩니다.');
  await expect(page.getByTestId(/^SCR-008-EL-11-.+/)).toHaveCount(1);
  await expect(page.getByTestId(/^SCR-008-EL-11-.+/).first()).toContainText('20 → 25');

  const changed = withParams({ allowableDiminutionPct: 25 });
  await page.goto(`/vessels/${vesselId}/forecast`);
  for (const member of seed.members.filter((m: any) => m.vesselId === vesselId)) {
    const fc = forecastMember(member, changed);
    await expect(tid(page, 'SCR-005-EL-03', member.memberId, 'renewal')).toContainText(fmt.mm(fc.renewalThicknessMm));
    await expect(tid(page, 'SCR-005-EL-03', member.memberId, 'renewalYear')).toContainText(fmt.year(fc.renewalYear));
  }

  await page.goto(`/vessels/${vesselId}/simulate`);
  await page.getByTestId(/^SCR-006-EL-08-.+/).first().click();
  await expect(tid(page, 'SCR-006-EL-05')).toContainText('허용 쇠모율 20%');
  for (const row of before.rows) {
    await expect(tid(page, 'SCR-006-EL-06', row.memberId, 'risk')).toHaveText(String(row.risk));
    await expect(tid(page, 'SCR-006-EL-06', row.memberId, 'grade'))
      .toContainText(GRADE_LABELS[row.grade as keyof typeof GRADE_LABELS]);
  }
});

test('SC-032 설정 검증 오류와 저장 실패', async ({ page, context }) => {
  await login(page, 'admin');
  await page.goto('/admin/settings');
  await tid(page, 'SCR-008-EL-05').fill('70');
  await tid(page, 'SCR-008-EL-07').click();
  await expect(tid(page, 'SCR-008-EL-09')).toContainText('중간 기준은 높음 기준보다 작아야 합니다.');
  await page.reload();
  await expect(tid(page, 'SCR-008-EL-05')).toHaveValue(String(seed.params.riskThresholds.medium));

  await tid(page, 'SCR-008-EL-01').fill('50');
  await tid(page, 'SCR-008-EL-07').click();
  await expect(tid(page, 'SCR-008-EL-09')).toContainText('5~40');

  await tid(page, 'SCR-008-EL-01').fill('25');
  await context.setOffline(true);
  await tid(page, 'SCR-008-EL-07').click();
  await expect(tid(page, 'SCR-008-EL-12')).toContainText('저장하지 못했습니다.');
  await expect(tid(page, 'SCR-008-EL-01')).toHaveValue('25');
  await context.setOffline(false);
});
