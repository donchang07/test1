// feature: inspection-review — SC-012 ~ SC-018
import { test, expect } from '@playwright/test';
import {
  tid, seed, scenarios, login, resetData, pendingOf, firstPendingCompleted, selectAllFindings, memberOf, reviseFinding,
} from './support/app';

test.beforeEach(async ({ request, page }) => {
  await resetData(request);
  await login(page, 'inspector');
});

test('SC-012 선박 개요 카드·다음 단계·없는 선박', async ({ page }) => {
  const vesselId = scenarios.crackVessel.vesselId;
  const vessel = seed.vessels.find((v: any) => v.vesselId === vesselId);
  await page.goto(`/vessels/${vesselId}`);
  await expect(tid(page, 'SCR-003-EL-01')).toContainText(vessel.name);
  await expect(tid(page, 'SCR-003-EL-02')).toContainText(vessel.classNotation);
  await expect(tid(page, 'SCR-003-EL-03')).toContainText(`미검토 ${pendingOf(vesselId)}건`);
  await expect(tid(page, 'SCR-003-EL-05')).toContainText('미실행');
  await expect(tid(page, 'SCR-003-EL-06')).toContainText('없음');
  await expect(tid(page, 'SCR-003-EL-07')).toHaveText('판독 시작하기');
  await tid(page, 'SCR-003-EL-07').click();
  await expect(page).toHaveURL(new RegExp(`/vessels/${vesselId}/review$`));
  await expect(tid(page, 'NAV-12')).toHaveAttribute('aria-current', 'page');

  const res = await page.goto('/vessels/KR-SYN-999');
  expect(res?.status()).toBe(404);
  await expect(tid(page, 'SCR-003-EL-08')).toContainText('선박을 찾을 수 없습니다.');
  await tid(page, 'SCR-003-EL-08', 'back').click();
  await expect(page).toHaveURL(/\/fleet$/);
});

test('SC-013 AI 결과 확정', async ({ page }) => {
  const vesselId = 'KR-SYN-001';
  const finding = firstPendingCompleted(vesselId);
  const pending = pendingOf(vesselId);
  await page.goto(`/vessels/${vesselId}/review`);
  await expect(tid(page, 'SCR-004-EL-01')).toContainText(`미검토 ${pending}건`);
  await selectAllFindings(page);
  await expect(tid(page, 'SCR-004-EL-03', finding.findingId, 'status')).toHaveText('미검토');
  await tid(page, 'SCR-004-EL-04', finding.findingId).click();
  await expect(tid(page, 'SCR-004-EL-15')).toHaveText('판독 결과를 저장했습니다.');
  await expect(tid(page, 'SCR-004-EL-03', finding.findingId, 'status')).toHaveText('확정');
  await expect(tid(page, 'SCR-004-EL-01')).toContainText(`미검토 ${pending - 1}건`);
  await expect(tid(page, 'SCR-004-EL-01')).toContainText('확정 1건');
});

test('SC-014 수정 후 확정과 보고서 초안', async ({ page }) => {
  const { vesselId, memberId } = scenarios.crackVessel;
  const crack = seed.findings.find((f: any) => f.memberId === memberId && f.aiLabel === 'crack');
  const note = '선체 균열 길이 재측정 필요';
  await reviseFinding(page, vesselId, crack.findingId, 'crack', 3, note);
  await expect(tid(page, 'SCR-004-EL-03', crack.findingId, 'human')).toContainText('판정: 균열 · 심각도 3');
  await expect(tid(page, 'SCR-004-EL-03', crack.findingId, 'note')).toHaveText(`메모: ${note}`);
  await expect(tid(page, 'SCR-004-EL-03', crack.findingId, 'ai')).toContainText('AI: 균열');
  await expect(tid(page, 'SCR-004-EL-03', crack.findingId, 'ai')).toContainText('91%');

  await tid(page, 'SCR-004-EL-16').click();
  await expect(tid(page, 'SCR-004-EL-17')).toContainText(`(${vesselId}) 판독 보고서 초안`);
  await expect(tid(page, 'SCR-004-EL-17')).toContainText(`${memberOf(memberId).name}: 균열 심각도 3`);
  await expect(tid(page, 'SCR-004-EL-17')).toContainText(`미검토 ${pendingOf(vesselId) - 1}건은 포함되지 않았습니다.`);
});

test('SC-015 기각 → 검토 취소 → 미검토, 빈 필터', async ({ page }) => {
  const vesselId = 'KR-SYN-001';
  const finding = firstPendingCompleted(vesselId, 1);
  await page.goto(`/vessels/${vesselId}/review`);
  await selectAllFindings(page);
  await tid(page, 'SCR-004-EL-06', finding.findingId).click();
  await expect(tid(page, 'SCR-004-EL-03', finding.findingId, 'status')).toHaveText('기각');
  await tid(page, 'SCR-004-EL-12', finding.findingId).click();
  await expect(tid(page, 'SCR-004-EL-03', finding.findingId, 'status')).toHaveText('미검토');
  await expect(tid(page, 'SCR-004-EL-04', finding.findingId)).toBeVisible();
  await tid(page, 'SCR-004-EL-02', 'rejected').click();
  await expect(tid(page, 'SCR-004-EL-20')).toHaveText('이 조건에 해당하는 판독이 없습니다.');
});

test('SC-016 이미지 없는 선박의 빈 상태', async ({ page }) => {
  await page.goto(`/vessels/${scenarios.noImageVessel.vesselId}/review`);
  await expect(tid(page, 'SCR-004-EL-14')).toHaveText('등록된 검사 이미지가 없습니다.');
  await expect(page.getByTestId(/^SCR-004-EL-03-/)).toHaveCount(0);
});

test('SC-017 AI 판독 실패 카드는 수동 판정만 가능', async ({ page }) => {
  const vesselId = scenarios.aiFailedVessel.vesselId;
  const failed = seed.findings.find((f: any) => f.vesselId === vesselId && f.aiStatus === 'failed');
  await page.goto(`/vessels/${vesselId}/review`);
  await selectAllFindings(page);
  await expect(tid(page, 'SCR-004-EL-13', failed.findingId)).toHaveText('AI 판독에 실패했습니다. 수동으로 판정하세요.');
  await expect(tid(page, 'SCR-004-EL-04', failed.findingId)).toHaveCount(0);
  await expect(tid(page, 'SCR-004-EL-06', failed.findingId)).toHaveCount(0);
  await tid(page, 'SCR-004-EL-05', failed.findingId).click();
  await expect(tid(page, 'SCR-004-EL-10')).toBeDisabled();
  await tid(page, 'SCR-004-EL-08', 'corrosion').click();
  await tid(page, 'SCR-004-EL-09', '2').click();
  await tid(page, 'SCR-004-EL-10').click();
  await expect(tid(page, 'SCR-004-EL-03', failed.findingId, 'status')).toHaveText('확정');
  await expect(tid(page, 'SCR-004-EL-03', failed.findingId, 'human')).toContainText('판정: 부식 · 심각도 2');
});

test('SC-018 오프라인 저장 실패 시 상태 유지', async ({ page, context }) => {
  const vesselId = 'KR-SYN-001';
  const finding = firstPendingCompleted(vesselId);
  await page.goto(`/vessels/${vesselId}/review`);
  await selectAllFindings(page);
  await context.setOffline(true);
  await tid(page, 'SCR-004-EL-04', finding.findingId).click();
  await expect(tid(page, 'SCR-004-EL-18')).toHaveText('저장하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.');
  await expect(tid(page, 'SCR-004-EL-03', finding.findingId, 'status')).toHaveText('미검토');
  await context.setOffline(false);
});
