// feature: risk-simulation — SC-023 ~ SC-025
import { test, expect } from '@playwright/test';
import {
  tid, seed, scenarios, login, resetData, simulateVessel, withDecisions, GRADE_LABELS, fmt, runSimulation, reviseFinding,
} from './support/app';

test.beforeEach(async ({ request, page }) => {
  await resetData(request);
  await login(page, 'inspector');
});

test('SC-023 기본 조건 시뮬레이션 결과가 기준 모델과 일치한다', async ({ page }) => {
  const vesselId = 'KR-SYN-001';
  const expected = simulateVessel(vesselId, { horizonYears: 3, route: 'moderate' }, seed);
  await page.goto(`/vessels/${vesselId}/simulate`);
  await expect(tid(page, 'SCR-006-EL-01', '3')).toHaveAttribute('aria-pressed', 'true');
  await expect(tid(page, 'SCR-006-EL-02', 'moderate')).toHaveAttribute('aria-pressed', 'true');
  await runSimulation(page, vesselId);

  const { high, medium, low } = expected.counts;
  await expect(tid(page, 'SCR-006-EL-05')).toContainText(`높음 ${high} · 중간 ${medium} · 낮음 ${low}`);
  for (const row of expected.rows) {
    const cell = (col: string) => tid(page, 'SCR-006-EL-06', row.memberId, col);
    await expect(cell('risk')).toHaveText(String(row.risk));
    await expect(cell('grade')).toContainText(GRADE_LABELS[row.grade as keyof typeof GRADE_LABELS]);
    await expect(cell('ci')).toContainText(fmt.index(row.conditionIndex));
    await expect(cell('pof')).toContainText(fmt.index(row.pof));
  }
  const rows = page.getByTestId(/^SCR-006-EL-06-KR-SYN-001-M\d{2}$/);
  await expect(rows.first()).toHaveAttribute('data-testid', `SCR-006-EL-06-${expected.topMemberId}`);

  const bowMembers = seed.members.filter((m: any) => m.vesselId === vesselId && m.zone === '선수부').length;
  await tid(page, 'SCR-006-EL-07', '선수부').click();
  await expect(rows).toHaveCount(bowMembers);
  await tid(page, 'SCR-006-EL-07', '선수부').click();
  await expect(rows).toHaveCount(16);
});

test('SC-024 균열 확정이 시뮬레이션 위험 100점으로 이어진다', async ({ page }) => {
  const { vesselId, memberId } = scenarios.crackVessel;
  const crack = seed.findings.find((f: any) => f.memberId === memberId && f.aiLabel === 'crack');
  await page.goto(`/vessels/${vesselId}/review`);
  await tid(page, 'SCR-004-EL-02', 'all').click();
  await tid(page, 'SCR-004-EL-04', crack.findingId).click();
  await expect(tid(page, 'SCR-004-EL-03', crack.findingId, 'status')).toHaveText('확정');

  await runSimulation(page, vesselId);
  const expected = simulateVessel(vesselId, { horizonYears: 3, route: 'moderate' },
    withDecisions({ [crack.findingId]: { label: 'crack', severity: 3 } }));
  const row = expected.rows.find((r) => r.memberId === memberId)!;
  expect(row.risk).toBe(100);
  await expect(tid(page, 'SCR-006-EL-06', memberId, 'risk')).toHaveText('100');
  await expect(tid(page, 'SCR-006-EL-06', memberId, 'grade')).toContainText('높음');
  await expect(tid(page, 'SCR-006-EL-06', memberId, 'crack')).toHaveText('예');
});

test('SC-025 빈 상태·실행 이력·실행 실패', async ({ page, context }) => {
  const vesselId = 'KR-SYN-004';
  await page.goto(`/vessels/${vesselId}/simulate`);
  await expect(tid(page, 'SCR-006-EL-09')).toBeVisible();
  await expect(tid(page, 'SCR-006-EL-11')).toHaveCount(0);

  await runSimulation(page, vesselId, 3, 'moderate');
  await runSimulation(page, vesselId, 5, 'harsh');
  const history = page.getByTestId(/^SCR-006-EL-08-.+/);
  await expect(history).toHaveCount(2);
  await expect(history.first()).toContainText('5년 · 황천');
  await history.nth(1).click();
  await expect(tid(page, 'SCR-006-EL-05')).toContainText('3년 · 보통');
  const first = simulateVessel(vesselId, { horizonYears: 3, route: 'moderate' }, seed);
  await expect(tid(page, 'SCR-006-EL-06', first.topMemberId, 'risk'))
    .toHaveText(String(first.rows.find((r) => r.memberId === first.topMemberId)!.risk));

  await context.setOffline(true);
  await tid(page, 'SCR-006-EL-03').click();
  await expect(tid(page, 'SCR-006-EL-10')).toContainText('시뮬레이션을 실행하지 못했습니다.');
  await expect(tid(page, 'SCR-006-EL-05')).toBeVisible();
  await context.setOffline(false);
});
