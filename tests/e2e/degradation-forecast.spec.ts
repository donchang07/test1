// feature: degradation-forecast — SC-019 ~ SC-022
import { test, expect, type Page } from '@playwright/test';
import {
  tid, seed, scenarios, login, resetData, pendingOf, forecastMember, withDecisions, fmt, reviseFinding,
} from './support/app';

test.beforeEach(async ({ request, page }) => {
  await resetData(request);
  await login(page, 'inspector');
});

async function expectForecastRow(page: Page, fc: ReturnType<typeof forecastMember>) {
  const row = (col: string) => tid(page, 'SCR-005-EL-03', fc.memberId, col);
  await expect(row('rate')).toContainText(fmt.rate(fc.rateMmPerYear));
  await expect(row('factor')).toContainText(fmt.factor(fc.findingFactor));
  await expect(row('renewal')).toContainText(fmt.mm(fc.renewalThicknessMm));
  await expect(row('renewalYear')).toContainText(fmt.year(fc.renewalYear));
}

test('SC-019 예측 표가 기준 모델과 일치하고 교체 도달 빠른 순으로 정렬된다', async ({ page }) => {
  const vesselId = 'KR-SYN-001';
  const forecasts = seed.members.filter((m: any) => m.vesselId === vesselId).map((m: any) => forecastMember(m, seed));
  await page.goto(`/vessels/${vesselId}/forecast`);
  const rows = page.getByTestId(/^SCR-005-EL-03-KR-SYN-001-M\d{2}$/);
  await expect(rows).toHaveCount(16);
  for (const fc of forecasts) await expectForecastRow(page, fc);

  const earliest = [...forecasts].sort((a, b) => (a.renewalYear ?? Infinity) - (b.renewalYear ?? Infinity)
    || a.memberId.localeCompare(b.memberId))[0];
  await expect(rows.first()).toHaveAttribute('data-testid', `SCR-005-EL-03-${earliest.memberId}`);
  await expect(tid(page, 'SCR-005-EL-05')).toContainText(seed.members.find((m: any) => m.memberId === earliest.memberId).name);

  await tid(page, 'SCR-005-EL-04', 'member').click();
  await expect(rows.first()).toHaveAttribute('data-testid', 'SCR-005-EL-03-KR-SYN-001-M01');
  const target = seed.members.find((m: any) => m.memberId === 'KR-SYN-001-M10');
  await tid(page, 'SCR-005-EL-03', target.memberId).click();
  await expect(tid(page, 'SCR-005-EL-05')).toContainText(target.name);
  await expect(tid(page, 'SCR-005-EL-06')).toBeVisible();
});

test('SC-020 실측 1회 부재는 데이터 부족과 기본 부식 속도', async ({ page }) => {
  const { vesselId, memberId } = scenarios.sparseVessel;
  await page.goto(`/vessels/${vesselId}/forecast`);
  await expect(tid(page, 'SCR-005-EL-03', memberId, 'status')).toContainText('데이터 부족');
  await expect(tid(page, 'SCR-005-EL-03', memberId, 'rate')).toContainText(fmt.rate(seed.params.defaultCorrosionRateMmPerYear));
});

test('SC-021 미검토 판독 경고와 이동', async ({ page }) => {
  await page.goto('/vessels/KR-SYN-001/forecast');
  await expect(tid(page, 'SCR-005-EL-01')).toContainText(`미검토 AI 판독 ${pendingOf('KR-SYN-001')}건`);
  await tid(page, 'SCR-005-EL-02').click();
  await expect(page).toHaveURL(/\/vessels\/KR-SYN-001\/review$/);

  await page.goto(`/vessels/${scenarios.noImageVessel.vesselId}/forecast`);
  await expect(tid(page, 'SCR-005-EL-03')).toBeVisible();
  await expect(tid(page, 'SCR-005-EL-01')).toHaveCount(0);
});

test('SC-022 판독 확정이 예측 보정계수로 이어진다', async ({ page }) => {
  const vesselId = scenarios.aiFailedVessel.vesselId;
  const finding = seed.findings
    .filter((f: any) => f.vesselId === vesselId && f.aiStatus === 'completed' && f.aiLabel === 'corrosion')
    .sort((a: any, b: any) => a.findingId.localeCompare(b.findingId))[0];
  await reviseFinding(page, vesselId, finding.findingId, 'corrosion', 2);

  const data = withDecisions({ [finding.findingId]: { label: 'corrosion', severity: 2 } });
  const member = seed.members.find((m: any) => m.memberId === finding.memberId);
  const fc = forecastMember(member, data);
  expect(fc.findingFactor).toBe(1.4);
  await page.goto(`/vessels/${vesselId}/forecast`);
  await expectForecastRow(page, fc);
});
