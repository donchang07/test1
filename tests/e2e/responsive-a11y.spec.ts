// 전 feature 공통 — SC-033(모바일), SC-034(자동 접근성 검사)
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  tid, login, resetData, firstPendingCompleted, selectAllFindings, runSimulation, optimize, expectNoHorizontalScroll,
} from './support/app';

test.beforeEach(async ({ request }) => {
  await resetData(request);
});

test('SC-033 모바일 390px에서 메뉴 트레이와 판독 확정 흐름 @mobile', async ({ page }) => {
  await login(page, 'inspector');
  await expectNoHorizontalScroll(page);
  await expect(tid(page, 'NAV-02')).toBeHidden();
  await tid(page, 'NAV-06').click();
  await expect(tid(page, 'NAV-06')).toHaveAttribute('aria-expanded', 'true');
  await tid(page, 'NAV-02').click();
  await expect(page).toHaveURL(/\/fleet$/);

  const finding = firstPendingCompleted('KR-SYN-001');
  await page.goto('/vessels/KR-SYN-001/review');
  await expectNoHorizontalScroll(page);
  await selectAllFindings(page);
  await tid(page, 'SCR-004-EL-04', finding.findingId).click();
  await expect(tid(page, 'SCR-004-EL-03', finding.findingId, 'status')).toHaveText('확정');

  for (const path of ['/vessels/KR-SYN-001/forecast', '/vessels/KR-SYN-001/simulate', '/vessels/KR-SYN-001/plan']) {
    await page.goto(path);
    await expectNoHorizontalScroll(page);
  }
});

test('SC-034 P0 화면 자동 접근성 검사 심각 위반 0건', async ({ page }) => {
  const check = async (label: string) => {
    const result = await new AxeBuilder({ page }).analyze();
    const serious = result.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious.map((v) => `${label}: ${v.id}`)).toEqual([]);
  };
  await page.goto('/login');
  await check('SCR-001');
  await login(page, 'inspector');
  await check('SCR-002');
  await page.goto('/vessels/KR-SYN-001/review');
  await check('SCR-004');
  await runSimulation(page, 'KR-SYN-001');
  await check('SCR-006');
  await optimize(page, 'KR-SYN-001');
  await expect(tid(page, 'SCR-007-EL-06')).toBeVisible();
  await check('SCR-007');
});
