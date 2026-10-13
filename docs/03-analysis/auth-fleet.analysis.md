# auth-fleet Gap Analysis (Check)

> Plan: `docs/01-plan/features/auth-fleet.plan.md` · Design: `docs/02-design/features/auth-fleet.design.md` · PRD: `docs/00-pm/auth-fleet.prd.md`(정본 v1.5) · 분석일 2026-10-13

## 1. 결론

| 관문 | 기준 | 결과 | 판정 |
|---|---|---|---|
| Match Rate | 95% 이상 | **97.7%**(84/86) | 통과 |
| `npm run test:unit` | 전체 통과 | 13/13 통과 | 통과 |
| auth-fleet SC(게이트 범위) | SC-001, 003, 005~010 | 8/8 통과 | 통과 |
| `npm run test:e2e`(전체) | 전체 통과 | 9/34 통과, 25 실패 | **미통과** — 실패 25건은 전부 이후 feature 배치 SC |

CLAUDE.md 완료 규칙("위 테스트 전체 통과")은 전체 `npm run test:e2e`를 요구한다. 실패 25건은 아직 구현하지 않은 SCR-004~008 화면에 의존하므로 auth-fleet 단독으로는 통과시킬 수 없다. `docs/00-pm/auth-fleet.gate.md` 완료 조건(feature 범위 SC + `test:unit`, 전체 E2E는 마지막 feature 후)은 충족했다. **두 규칙이 다르므로 `/pdca report` 진행 여부는 사용자 판단이 필요하다.**

## 2. 실행 기록

모든 명령은 수정 반영 후 프로덕션 빌드(`npm run start:e2e`, `APP_TEST_MODE=1`, `data/e2e.db`)로 실행했다.

| 명령 | 결과 |
|---|---|
| `npm run test:unit` | pass 13, fail 0 |
| `npm run typecheck` | 오류 0 |
| `npm run prd:check` | 오류 0건 |
| `node scripts/run-sc.mjs auth-fleet` | 8/8 SC 통과(누적) |
| `npm run test:e2e` | 9 passed, 25 failed(10.0분) |

### 2.1 전체 E2E SC별 결과

| SC | 결과 | 배치 feature(PRD 14장) |
|---|---|---|
| SC-001, 003, 005~010 | 통과 | auth-fleet |
| SC-012 | 통과 | inspection-review(뼈대의 선박 개요로 이미 통과) |
| SC-011, 013~018 | 실패 | inspection-review — SCR-004 미구현 |
| SC-004, 019~022 | 실패 | degradation-forecast — SCR-005 미구현 |
| SC-023~025 | 실패 | risk-simulation — SCR-006 미구현 |
| SC-002, 026~034 | 실패 | inspection-plan — SCR-007·008 미구현, SC-033·034는 판독·시뮬레이션·계획 화면 필요 |

수정 전 기준선도 같은 9건 통과·25건 실패였다. 회귀는 없다.

### 2.2 SC 밖 추가 검증(임시 스크립트, 커밋하지 않음)

| 항목 | 방법 | 결과 |
|---|---|---|
| 오픈 리다이렉트 | `next`에 `/\evil.com`, `//evil.com`, `https://evil.com` | 모두 `/fleet`. 내부 경로는 그대로 |
| SCR-009 HTTP 상태 | `GET /forbidden` | 403 |
| API 권한 | 검사원 `POST /api/admin/reset` | 403 `{"error":"forbidden"}` + 서버 로그 |
| 세션 만료 | expire-session 후 `/fleet` | `/login?reason=expired`, 세션 행 삭제 |
| 인증 실패 로그 | 잘못된 비밀번호 | `{"event":"login_failed","emailHash":…,"count":n}`(이메일 원문 없음) |
| modal-sheet | Playwright 키보드 | 첫 포커스 `취소`, Tab/Shift+Tab 순환, Esc 닫기, 닫으면 EL-10으로 복귀 |
| NAV-01 모바일 | 390px | 로고 중심 x=195(정중앙) |
| 접근성(axe) | SCR-001, SCR-002, SCR-002-EL-11, SCR-009 | serious·critical 0건 |

## 3. Match Rate 산정

PRD 요구 항목 86개를 대조했다(화면 요소·문구·상태, NAV, footer, 보안, 로그, 환경 변수, 디자인 토큰, 컴포넌트 이름).

| 묶음 | 항목 | 일치 |
|---|---|---|
| SCR-001 | 14 | 14 |
| SCR-002 | 22 | 22 |
| SCR-009 | 4 | 4 |
| NAV-01~06 | 9 | 9 |
| FOOTER-NOTICE / NFR-09 | 2 | 1 |
| 보안 | 16 | 16 |
| FR-009 | 1 | 1 |
| 환경 변수 | 5 | 5 |
| 디자인 토큰 | 9 | 9 |
| 로그(7장) | 3 | 3 |
| 컴포넌트 이름(9장) | 1 | 0 |
| **합계** | **86** | **84 (97.7%)** |

## 4. 이번 Do에서 고친 차이

| # | PRD 근거 | 수정 | 파일 |
|---|---|---|---|
| 1 | 4.3 `next`는 내부 경로만 | 백슬래시·제어 문자를 거부하고 origin을 대조 | `lib/auth.ts` |
| 2 | SCR-009 `/forbidden (HTTP 403)` | middleware에서 같은 경로로 rewrite하면서 status 403 지정 | `middleware.ts` |
| 3 | 9.3 modal-sheet 포커스 트랩·Esc | 트랩, 시트 Esc, 첫 포커스 취소(파괴적 버튼 기본 선택 방지), 닫을 때 포커스 복귀 | `app/fleet/AdminReset.tsx` |
| 4 | 7장 인증 실패 서버 로그(이메일 해시) | 해시 + 누적 횟수 로그 | `lib/auth.ts`, `app/api/auth/login/route.ts` |
| 5 | 7장 권한 없음 서버 로그(화면·API) | `forbidden` 로그 | `lib/auth.ts`, `app/api/admin/reset/route.ts` |
| 6 | 7장 세션 만료 → 세션 삭제 | 만료 행 삭제 | `lib/auth.ts` |
| 7 | NFR-09 모든 화면 footer | ERROR-PAGE에 footer 추가 | `app/error.tsx` |
| 8 | NAV-01 모바일 중앙 로고 | 절대 위치로 중앙 정렬 | `app/globals.css` |
| 9 | SCR-001 모바일 좌우 16px | `login-main` 패딩 | `app/login/page.tsx`, `app/globals.css` |
| 10 | SCR-001-EL-07 fine-print | `fine-print`(12px/400) | 같은 파일 |
| 11 | 9.3 data-table 행 body | 17px | `app/globals.css` |
| 12 | 9.3 status-badge caption | 14px/400 | `app/globals.css` |
| 13 | 9.1 Pretendard만 | 폰트 스택 `Pretendard, sans-serif` | `app/globals.css` |
| 14 | 9.3 `sub-nav-frosted` | 클래스 이름 변경 | `components/VesselSubNav.tsx`, `app/globals.css` |
| 15 | SC-034 접근성 | 읽는 보조 텍스트를 `ink-muted-80`으로 변경. `ink-muted-48`(4.29:1)은 비활성 전용 | `app/globals.css` |

도구 수정: `scripts/run-sc.mjs`의 `--grep`가 `^`로 시작해 Playwright 전체 제목("프로젝트 파일 제목")과 맞지 않아 모든 SC가 not run으로 나왔다. 공백 경계로 바꿨다.

## 5. 남은 차이(2건)

| # | 내용 | 이유 | 제안 |
|---|---|---|---|
| G-1 | 없는 경로의 Next 기본 404에는 footer 고지가 없다(NFR-09 "모든 화면") | PRD에 루트 404 화면·요소 ID가 없다. ID 없는 UI를 만들면 CLAUDE.md 규칙 위반 | PRD에 공통 404 화면(예: `NOT-FOUND`)을 추가하는 갱신 요청 |
| G-2 | 레이아웃 보조 클래스 `modal-backdrop`, `kpi-grid`, `toolbar`, `login-card`, `login-main`이 9장 목록 밖 | 9.3 컴포넌트가 아니라 배치용 보조 클래스. React 컴포넌트 이름은 design 5.3에 있음 | 9장에 "보조 레이아웃 클래스 허용" 문구를 추가할지 결정 |

## 6. 결정·주의 사항

- **ink-muted-48 사용 범위:** DESIGN.md는 fine-print에 `ink-muted-48`을 쓰도록 하지만, 흰 배경 대비가 4.29:1로 WCAG AA(4.5:1)와 SC-034를 통과하지 못한다. 같은 DESIGN 토큰인 `ink-muted-80`을 썼다. PRD 9.1에 이 예외를 적는 갱신을 권장한다.
- **E2E 환경 변수:** 실행 환경에 `SEED_*`가 이미 있으면 그 값이 `.env.local`보다 우선한다(playwright.config). 서버만 다른 값으로 띄우면 로그인 E2E가 전부 실패하므로, 서버와 Playwright는 같은 값을 써야 한다.

## Version History

| 버전 | 날짜 | 내용 |
|---|---|---|
| 1.0 | 2026-10-13 | 최초 작성 |
