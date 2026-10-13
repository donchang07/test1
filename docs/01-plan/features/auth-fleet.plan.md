# auth-fleet Planning Document

> PRD: `docs/00-pm/auth-fleet.prd.md` (정본 `docs/PRD.md` v1.5) · bkit v2.1.40 · 작성 2026-10-13

## Executive Summary

| 관점 | 내용 |
|---|---|
| Problem | 검사 데이터는 보호 대상인데 역할(검사원·관리자) 구분 없이는 승인·설정 같은 관리 행동을 막을 수 없고, 선대 전체의 판독 대기·위험을 한눈에 볼 화면이 없다 |
| Solution | 시드 계정 기반 로그인·세션·역할 보호와 선대 위험 현황 대시보드(KPI·검색·선종 필터·관리자 초기화)를 SQLite 위에 구현한다 |
| Function UX Effect | 로그인 후 원래 화면으로 복귀, 세션 만료 안내, 권한 없는 화면은 접근 거부, 12척 선대를 검색·필터로 즉시 좁힘 |
| Core Value | 이후 4단계 feature가 공통으로 쓰는 인증·DB·레이아웃 토대를 검증된 상태로 제공 |

## Context Anchor

| 축 | 내용 |
|---|---|
| WHY | 보호 데이터와 관리자 행동을 역할로 분리하고, 선대 단위 위험 현황을 출발점으로 제공 |
| WHO | 검사원(inspector), 검사기획 관리자(admin), 비로그인 사용자 |
| RISK | 오픈 리다이렉트, 세션 탈취, 검사원의 관리자 기능 접근, 테스트 API의 시연 서버 노출 |
| SUCCESS | SC-001, SC-003, SC-005~010 전부 통과, Match Rate 95% 이상 |
| SCOPE | SCR-001·002·009, NAV-01~06, 공통 레이아웃·footer, SQLite 마이그레이션·시드, 테스트 API |

## 1. Overview

### 1.1 Purpose
PRD FR-001~010을 구현해 로그인·세션·권한과 선대 현황을 제공한다.

### 1.2 Background
뼈대 단계에서 같은 범위를 1차 구현했다(커밋 9ab7447). 이번 PDCA는 그 구현을 PRD 계약 기준으로 확정·검증한다.

### 1.3 Related Documents
- PRD: `docs/00-pm/auth-fleet.prd.md`
- 디자인 시스템: `docs/DESIGN.md`
- 테스트: `tests/e2e/auth-fleet.spec.ts`

## 2. Scope

### 2.1 In Scope
- [x] 로그인·로그아웃·세션 만료(8시간)·`next` 복귀(내부 경로만)
- [x] 역할 보호: 관리자 메뉴·초기화 버튼·관리자 경로
- [x] 선대 현황 KPI 4종, 검색, 선종 칩, 빈 상태, 관리자 초기화 모달·토스트
- [x] SQLite 마이그레이션·자동 시드·`npm run db:seed`
- [x] 테스트 모드 API(`/api/test/reset`, `/api/test/expire-session`)

### 2.2 Out of Scope
- 판독·예측·시뮬레이션·계획·모델 설정 화면 내용(이후 feature)
- PRD 비목표 NG-1~9 전체(실데이터, 실제 AI, SSO, 클라우드 배포 등)

## 3. Requirements

### 3.1 Functional Requirements

| ID | 요구사항 | 우선순위 | 상태 |
|---|---|---|---|
| FR-001 | 시드 계정 로그인 → `next` 또는 `/fleet` | High | 뼈대 구현됨 |
| FR-002 | 인증 실패 시 같은 문구 | High | 뼈대 구현됨 |
| FR-003 | 미인증 → `/login?next=` → 복귀 | High | 뼈대 구현됨 |
| FR-004 | 세션 만료 → `reason=expired` 안내 | High | 뼈대 구현됨 |
| FR-005 | 로그아웃·`no-store` | High | 뼈대 구현됨 |
| FR-006 | 역할 접근 제어(화면·API·메뉴) | High | 뼈대 구현됨 |
| FR-007 | KPI·선박 표 | High | 뼈대 구현됨 |
| FR-008 | 검색·선종 필터·빈 상태 | High | 뼈대 구현됨 |
| FR-009 | 관리자 합성 데이터 초기화 | Medium | 뼈대 구현됨 |
| FR-010 | 테스트 모드 API | High | 뼈대 구현됨 |

### 3.2 Non-Functional Requirements

| 분류 | 기준 | 측정 |
|---|---|---|
| 보안 | bcrypt 해시, 세션 토큰 해시 저장, HttpOnly·SameSite=Lax, localhost 바인딩 | 코드 검토 |
| 성능 | 화면 응답 1초 이내 | E2E 실행 시간 |
| 접근성 | 라벨 연결, `role=alert`, 키보드 Enter로 행 이동 | SC-034(최종 feature) |

## 4. Success Criteria

### 4.1 Definition of Done
- [ ] SC-001, SC-003, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010 E2E 통과
- [ ] `npm run test:unit`, `npm run typecheck` 통과
- [ ] gap-detector Match Rate 95% 이상

### 4.2 Quality Criteria
- 모든 UI 요소에 PRD 요소 ID `data-testid`
- 서버 전용 모듈(`server-only`)로 DB·인증 코드 격리

## 5. Risks and Mitigation

| 위험 | 영향 | 가능성 | 대응 |
|---|---|---|---|
| 오픈 리다이렉트 | 중 | 중 | `safeNext`로 `/` 시작·`//` 금지 |
| 테스트 API가 시연 서버에서 열림 | 상 | 하 | `APP_TEST_MODE=1`일 때만, 시연 서버 404 확인 |
| Edge 미들웨어에서 SQLite 불가 | 중 | 상 | 미들웨어 대신 서버 컴포넌트 `requireUser`로 보호 |

## 6. Impact Analysis

### 6.1 Changed Resources
`app/login`, `app/fleet`, `app/forbidden`, `app/api/auth/*`, `app/api/test/*`, `app/api/admin/reset`, `lib/auth.ts`, `lib/db.ts`, `lib/queries.ts`, `lib/seed-core.mjs`, `components/*`, `db/migrations/001_init.sql`

### 6.2 Current Consumers
이후 4개 feature 전부가 `requireUser`, `AppShell`, `db()`, `fleet()`를 사용한다.

### 6.3 Verification
`npm run test:sc auth-fleet`(누적 SC 실행) + gap-detector 분석.

## 7. Architecture Considerations

### 7.1 Project Level Selection
Dynamic(풀스택) — PRD 11장. 단, BaaS 대신 로컬 SQLite(PRD v1.3 사용자 결정).

### 7.2 Key Architectural Decisions

| 결정 | 선택 | 근거 |
|---|---|---|
| 프레임워크 | Next.js 15 App Router | PRD 11장 |
| DB | SQLite(better-sqlite3) | 사용자 결정, localhost |
| 인증 | 자체 세션(쿠키 + `sessions` 테이블) | PRD 5.4 |
| 보호 위치 | 서버 컴포넌트·Route Handler | SQLite가 Edge에서 동작하지 않음 |

### 7.3 Clean Architecture Approach
`app/`(화면·API) → `lib/`(인증·쿼리·DB) → `db/`(SQL). 화면 컴포넌트는 DB에 직접 접근하지 않는다.

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions
`CLAUDE.md` to-prd 규칙(DESIGN.md, Pretendard, data-testid, 비목표 금지).

### 8.2 Conventions to Define/Verify
- 반복 요소 testid `{요소 ID}-{레코드 ID}`, 셀 `{행 testid}-{열 키}`

### 8.3 Environment Variables Needed
`SEED_INSPECTOR_PASSWORD`, `SEED_ADMIN_PASSWORD`, `DATABASE_PATH`(선택), `APP_TEST_MODE`(E2E만) — PRD 11.3.

### 8.4 Pipeline Integration
해당 없음(단일 feature PDCA).

## 9. Next Steps
`/pdca design auth-fleet`

## Version History

| 버전 | 날짜 | 내용 |
|---|---|---|
| 1.0 | 2026-10-13 | 최초 작성 |
