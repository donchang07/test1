// feature: auth-fleet — SC-001 ~ SC-011
import { test, expect } from '@playwright/test';
import {
  T, tid, seed, login, fillLogin, password, resetData, pendingOf, firstPendingCompleted, selectAllFindings,
} from './support/app';

test.beforeEach(async ({ request }) => {
  await resetData(request);
});

test('SC-001 검사원 로그인 → 선대 현황, 관리자 메뉴 없음', async ({ page }) => {
  await page.goto('/login');
  await expect(tid(page, 'SCR-001-EL-01')).toHaveText('KR Smart RBI');
  await expect(tid(page, 'SCR-001-EL-07')).toBeVisible();
  await login(page, 'inspector');
  await expect(tid(page, 'SCR-002-EL-01')).toContainText('선대 위험 현황');
  await expect(tid(page, 'NAV-04')).toContainText('검사원 A · 검사원');
  await expect(tid(page, 'NAV-02')).toBeVisible();
  await expect(tid(page, 'NAV-03')).toHaveCount(0);
  await expect(page.getByTestId('FOOTER-NOTICE')).toContainText('합성 데이터');
});

test('SC-002 관리자 로그인 → 모델 설정 화면에 시드 파라미터', async ({ page }) => {
  await login(page, 'admin');
  await expect(tid(page, 'NAV-04')).toContainText('관리자');
  await tid(page, 'NAV-03').click();
  await expect(page).toHaveURL(/\/admin\/settings$/);
  const p = seed.params;
  await expect(tid(page, 'SCR-008-EL-01')).toHaveValue(String(p.allowableDiminutionPct));
  await expect(tid(page, 'SCR-008-EL-04')).toHaveValue(String(p.riskThresholds.high));
  await expect(tid(page, 'SCR-008-EL-05')).toHaveValue(String(p.riskThresholds.medium));
  await expect(tid(page, 'SCR-008-EL-06')).toHaveValue(String(p.defaultBudgetHours));
  await expect(tid(page, 'SCR-008-EL-07')).toBeDisabled();
});

test('SC-003 인증 실패 문구는 계정 존재 여부와 무관하게 같다', async ({ page }) => {
  const message = '이메일 또는 비밀번호가 올바르지 않습니다.';
  await page.goto('/login');
  await fillLogin(page, 'inspector1@synthetic.example', `${password('inspector')}-wrong`);
  await expect(tid(page, 'SCR-001-EL-05')).toHaveText(message);
  await expect(page).toHaveURL(/\/login/);
  await fillLogin(page, 'nobody@synthetic.example', 'whatever-123');
  await expect(tid(page, 'SCR-001-EL-05')).toHaveText(message);
  await expect(page).toHaveURL(/\/login/);
});

test('SC-004 미인증 접근 → 로그인 → 원래 화면 복귀', async ({ page }) => {
  await page.goto('/vessels/KR-SYN-001/forecast');
  await expect(page).toHaveURL(/\/login\?next=%2Fvessels%2FKR-SYN-001%2Fforecast/);
  await fillLogin(page, 'inspector1@synthetic.example', password('inspector'));
  await expect(page).toHaveURL(/\/vessels\/KR-SYN-001\/forecast$/);
  await expect(tid(page, 'SCR-005-EL-03')).toBeVisible();
});

test('SC-005 세션 만료 → 만료 안내', async ({ page }) => {
  await login(page, 'inspector');
  const res = await page.request.post('/api/test/expire-session');
  expect(res.status()).toBe(200);
  await page.goto('/vessels/KR-SYN-001');
  await expect(page).toHaveURL(/\/login\?.*reason=expired/);
  await expect(tid(page, 'SCR-001-EL-06')).toHaveText('세션이 만료되었습니다. 다시 로그인하세요.');
});

test('SC-006 검사원의 관리자 화면 접근 → 접근 거부', async ({ page }) => {
  await login(page, 'inspector');
  await page.goto('/admin/settings');
  await expect(page).toHaveURL(/\/forbidden$/);
  await expect(tid(page, 'SCR-009-EL-01')).toHaveText('이 화면에 접근할 권한이 없습니다.');
  await tid(page, 'SCR-009-EL-02').click();
  await expect(page).toHaveURL(/\/fleet$/);
});

test('SC-007 로그아웃 후 보호 경로는 다시 로그인을 요구한다', async ({ page }) => {
  await login(page, 'inspector');
  await tid(page, 'NAV-05').click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/fleet');
  await expect(page).toHaveURL(/\/login\?next=%2Ffleet/);
});

test('SC-008 KPI와 선박 표가 시드와 일치한다', async ({ page }) => {
  await login(page, 'inspector');
  await expect(tid(page, 'SCR-002-EL-01')).toContainText(`기준일 ${seed.meta.asOfDate}`);
  await expect(tid(page, 'SCR-002-EL-02')).toContainText(`${seed.vessels.length}척`);
  await expect(tid(page, 'SCR-002-EL-03')).toContainText(`${pendingOf()}건`);
  await expect(tid(page, 'SCR-002-EL-04')).toContainText('0개');
  await expect(tid(page, 'SCR-002-EL-05')).toContainText('0건');
  await expect(page.getByTestId(/^SCR-002-EL-08-KR-SYN-\d{3}$/)).toHaveCount(seed.vessels.length);
  for (const v of seed.vessels) {
    await expect(tid(page, 'SCR-002-EL-08', v.vesselId, 'name')).toHaveText(v.name);
    await expect(tid(page, 'SCR-002-EL-08', v.vesselId, 'pending')).toHaveText(String(pendingOf(v.vesselId)));
    await expect(tid(page, 'SCR-002-EL-08', v.vesselId, 'maxGrade')).toHaveText('미실행');
  }
  await tid(page, 'SCR-002-EL-08', 'KR-SYN-002').click();
  await expect(page).toHaveURL(/\/vessels\/KR-SYN-002$/);
});

test('SC-009 검색 필터와 빈 결과', async ({ page }) => {
  await login(page, 'inspector');
  await tid(page, 'SCR-002-EL-06').fill('칼립소');
  await expect(page.getByTestId(/^SCR-002-EL-08-KR-SYN-\d{3}$/)).toHaveCount(1);
  await expect(tid(page, 'SCR-002-EL-08', 'KR-SYN-003')).toBeVisible();
  await tid(page, 'SCR-002-EL-06').fill('kr-syn-01');
  await expect(page.getByTestId(/^SCR-002-EL-08-KR-SYN-\d{3}$/)).toHaveCount(3);
  await tid(page, 'SCR-002-EL-06').fill('없는선박');
  await expect(tid(page, 'SCR-002-EL-09')).toHaveText('조건에 맞는 선박이 없습니다.');
});

test('SC-010 선종 칩 필터', async ({ page }) => {
  await login(page, 'inspector');
  const tankers = seed.vessels.filter((v: any) => v.shipType === '유조선').length;
  await tid(page, 'SCR-002-EL-07', '유조선').click();
  await expect(page.getByTestId(/^SCR-002-EL-08-KR-SYN-\d{3}$/)).toHaveCount(tankers);
  await tid(page, 'SCR-002-EL-07', '전체').click();
  await expect(page.getByTestId(/^SCR-002-EL-08-KR-SYN-\d{3}$/)).toHaveCount(seed.vessels.length);
});

test('SC-011 관리자 합성 데이터 초기화, 검사원에게는 버튼 없음', async ({ page, browser }) => {
  const finding = firstPendingCompleted('KR-SYN-001');
  await login(page, 'admin');
  await page.goto('/vessels/KR-SYN-001/review');
  await selectAllFindings(page);
  await tid(page, 'SCR-004-EL-04', finding.findingId).click();
  await expect(tid(page, 'SCR-004-EL-03', finding.findingId, 'status')).toHaveText('확정');

  await page.goto('/fleet');
  await tid(page, 'SCR-002-EL-10').click();
  await expect(tid(page, 'SCR-002-EL-11')).toBeVisible();
  await tid(page, 'SCR-002-EL-11', 'confirm').click();
  await expect(tid(page, 'SCR-002-EL-12')).toHaveText('합성 데이터를 초기화했습니다.');

  await page.goto('/vessels/KR-SYN-001/review');
  await selectAllFindings(page);
  await expect(tid(page, 'SCR-004-EL-03', finding.findingId, 'status')).toHaveText('미검토');

  const inspector = await browser.newPage();
  await login(inspector, 'inspector');
  await expect(inspector.getByTestId(T('SCR-002-EL-10'))).toHaveCount(0);
  await inspector.close();
});
