// E2E 공통 도우미. 셀렉터는 PRD 요소 ID(= data-testid)만 쓴다(NFR-06).
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import {
  loadSeed, forecastMember, simulateVessel, optimizePlan, GRADE_LABELS, ROUTE_LABELS,
} from '../../reference/model.mjs';

export { forecastMember, simulateVessel, optimizePlan, GRADE_LABELS, ROUTE_LABELS };

export const seed = loadSeed();
export const scenarios = seed.meta.scenarios;

export const LABELS: Record<string, string> = {
  corrosion: '부식', crack: '균열', coating_breakdown: '도장 손상', none: '결함 아님',
};

/** 요소 ID와 레코드 ID·열 키를 이어 testid를 만든다. 예: T('SCR-004-EL-03', id, 'status') */
export function T(elementId: string, ...parts: string[]): string {
  return [elementId, ...parts].join('-');
}

export const tid = (page: Page, elementId: string, ...parts: string[]) => page.getByTestId(T(elementId, ...parts));

type Role = 'inspector' | 'inspector2' | 'admin';

const ACCOUNTS: Record<Role, { email: string; passwordEnv: string }> = {
  inspector: { email: 'inspector1@synthetic.example', passwordEnv: 'SEED_INSPECTOR_PASSWORD' },
  inspector2: { email: 'inspector2@synthetic.example', passwordEnv: 'SEED_INSPECTOR_PASSWORD' },
  admin: { email: 'admin1@synthetic.example', passwordEnv: 'SEED_ADMIN_PASSWORD' },
};

export function password(role: Role): string {
  const name = ACCOUNTS[role].passwordEnv;
  const value = process.env[name];
  if (!value) throw new Error(`환경 변수 ${name}가 필요합니다(.env.example 참조).`);
  return value;
}

export async function resetData(request: APIRequestContext) {
  const res = await request.post('/api/test/reset');
  expect(res.status(), 'APP_TEST_MODE=1로 서버를 띄웠는지 확인').toBe(200);
}

export async function fillLogin(page: Page, email: string, pw: string) {
  await tid(page, 'SCR-001-EL-02').fill(email);
  await tid(page, 'SCR-001-EL-03').fill(pw);
  await tid(page, 'SCR-001-EL-04').click();
}

export async function login(page: Page, role: Role) {
  await page.goto('/login');
  await fillLogin(page, ACCOUNTS[role].email, password(role));
  await expect(page).toHaveURL(/\/fleet$/);
}

export async function selectAllFindings(page: Page) {
  await tid(page, 'SCR-004-EL-02', 'all').click();
}

/** 시뮬레이션 화면에서 조건을 고르고 실행한 뒤 결과가 나올 때까지 기다린다. */
export async function runSimulation(page: Page, vesselId: string, horizonYears = 3, route = 'moderate') {
  await page.goto(`/vessels/${vesselId}/simulate`);
  await tid(page, 'SCR-006-EL-01', String(horizonYears)).click();
  await tid(page, 'SCR-006-EL-02', route).click();
  await tid(page, 'SCR-006-EL-03').click();
  await expect(tid(page, 'SCR-006-EL-05')).toContainText(`${horizonYears}년 · ${ROUTE_LABELS[route as keyof typeof ROUTE_LABELS]}`);
}

export async function optimize(page: Page, vesselId: string, budget?: number) {
  await page.goto(`/vessels/${vesselId}/plan`);
  if (budget !== undefined) await tid(page, 'SCR-007-EL-03').fill(String(budget));
  await tid(page, 'SCR-007-EL-04').click();
}

/** 판독 화면에서 사람 판정을 수정 저장한다. */
export async function reviseFinding(page: Page, vesselId: string, findingId: string, label: string, severity?: number, note?: string) {
  await page.goto(`/vessels/${vesselId}/review`);
  await selectAllFindings(page);
  await tid(page, 'SCR-004-EL-05', findingId).click();
  await expect(tid(page, 'SCR-004-EL-07')).toBeVisible();
  await tid(page, 'SCR-004-EL-08', label).click();
  if (severity !== undefined) await tid(page, 'SCR-004-EL-09', String(severity)).click();
  if (note !== undefined) await tid(page, 'SCR-004-EL-21').fill(note);
  await tid(page, 'SCR-004-EL-10').click();
  await expect(tid(page, 'SCR-004-EL-03', findingId, 'status')).toHaveText(label === 'none' ? '기각' : '확정');
}

/** 시드에 테스트 중 바꾼 판독 결정을 덮어쓴 데이터(기준 모델 입력용). */
export function withDecisions(decisions: Record<string, { label: string | null; severity: number | null; decision?: string }>) {
  return {
    ...seed,
    findings: seed.findings.map((f: any) => (decisions[f.findingId]
      ? {
        ...f,
        humanDecision: decisions[f.findingId].decision ?? 'confirmed',
        humanLabel: decisions[f.findingId].label,
        humanSeverity: decisions[f.findingId].severity,
      }
      : f)),
  };
}

export function withParams(overrides: Record<string, unknown>) {
  return { ...seed, params: { ...seed.params, ...overrides } };
}

export const pendingOf = (vesselId?: string) => seed.findings
  .filter((f: any) => f.humanDecision === 'pending' && (!vesselId || f.vesselId === vesselId)).length;

export const firstPendingCompleted = (vesselId: string, skip = 0) => seed.findings
  .filter((f: any) => f.vesselId === vesselId && f.humanDecision === 'pending' && f.aiStatus === 'completed')
  .sort((a: any, b: any) => a.findingId.localeCompare(b.findingId))[skip];

export const memberOf = (memberId: string) => seed.members.find((m: any) => m.memberId === memberId);

/** PRD 5.5 공통 숫자 표기 */
export const fmt = {
  mm: (v: number) => v.toFixed(2),
  rate: (v: number) => v.toFixed(3),
  year: (v: number | null) => (v === null ? '도달 안 함' : v.toFixed(1)),
  factor: (v: number) => `×${v.toFixed(2)}`,
  index: (v: number) => v.toFixed(2),
  hours: (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}시간`,
  pct: (v: number) => `${v.toFixed(1)}%`,
};

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
