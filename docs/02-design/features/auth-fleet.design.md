# auth-fleet Design Document

> Plan: `docs/01-plan/features/auth-fleet.plan.md` · PRD: `docs/00-pm/auth-fleet.prd.md` · bkit v2.1.40

## Context Anchor

| 축 | 내용 |
|---|---|
| WHY | 보호 데이터와 관리자 행동을 역할로 분리하고, 선대 단위 위험 현황을 출발점으로 제공 |
| WHO | 검사원, 검사기획 관리자, 비로그인 사용자 |
| RISK | 오픈 리다이렉트, 세션 탈취, 권한 우회, 테스트 API 노출 |
| SUCCESS | SC-001, SC-003, SC-005~010 통과, Match Rate 95% 이상 |
| SCOPE | SCR-001·002·009, NAV-01~06, 레이아웃, SQLite, 테스트 API |

## 1. Overview

### 1.1 Design Goals
- 이후 feature가 재사용할 인증·DB·레이아웃 토대
- PRD 요소 ID를 그대로 `data-testid`로 노출

### 1.2 Design Principles
- 서버에서 권한을 판정하고 클라이언트는 표시만 한다
- DB 접근은 `lib/`의 서버 전용 모듈로 한정한다

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

| 안 | 내용 | 복잡도 | 유지보수 | 위험 |
|---|---|---|---|---|
| A — Minimal | 페이지마다 쿠키·SQL 직접 처리 | 낮음 | 낮음 | 권한 누락 위험 |
| B — Clean | 리포지토리·서비스·도메인 계층 분리, DI | 높음 | 높음 | 과설계 |
| **C — Pragmatic (선택)** | `lib/auth`(세션·가드), `lib/queries`(읽기), `lib/db`(연결·시드), 화면은 서버 컴포넌트 + 상호작용만 클라이언트 | 중간 | 높음 | 낮음 |

선택: **C** — bkit 기본 추천안. 사용자 지시(추천안 채택)에 따라 확정.

### 2.1 Component Diagram

```
Browser ──fetch──► app/api/auth/{login,logout} ─┐
   │                app/api/admin/reset ────────┤
   │                app/api/test/{reset,expire} ┤
   ▼                                            ▼
app/(pages: login, fleet, forbidden, vessels)  lib/auth.ts ──► lib/db.ts ──► SQLite(data/app.db)
   └─ requireUser(path, {admin}) ───────────────┘   lib/queries.ts ─┘      ▲ lib/seed-core.mjs ◄ data/seed/*.json
```

### 2.2 Data Flow
로그인: 폼 → `POST /api/auth/login` → bcrypt 비교 → 토큰 발급(해시 저장) → 쿠키 → `next`로 이동. 화면 요청: 서버 컴포넌트가 쿠키 → 세션 조회 → 없음/만료/권한 분기.

### 2.3 Dependencies
next 15.5.27, react 19.1.1, better-sqlite3 13.0.3, bcryptjs 3.0.3, pretendard 1.3.9, server-only.

## 3. Data Model

### 3.1 Entity Definition
PRD 부록 A DATA-001(users·sessions), DATA-002(vessels), DATA-005(findings, 집계), DATA-009·010(집계용).

### 3.2 Entity Relationships
users 1—N sessions, vessels 1—N findings/simulation_runs, vessels 1—1 inspection_plans.

### 3.3 Database Schema
`db/migrations/001_init.sql`(전 테이블 선생성). 시드: `lib/seed-core.mjs`(`resetBusinessData`, `seedUsers`).

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| POST | /api/auth/login | 공개 | 로그인, 세션 쿠키 발급, `{ next }` |
| POST | /api/auth/logout | 로그인 | 세션 삭제 |
| POST | /api/admin/reset | 관리자 | 업무 데이터 시드 복원(FR-009) |
| POST | /api/test/reset | 테스트 모드 | 시드 복원 + 시드 계정 재설정(FR-010) |
| POST | /api/test/expire-session | 테스트 모드 | 현재 세션 만료(FR-010) |

### 4.2 Detailed Specification
- login: 본문 `{ email, password, next }` → 200 `{ next }` / 401 `{ error: 'invalid_credentials' }`
- admin/reset: 401 미인증, 403 검사원, 200 `{ ok: true }`
- test/*: `APP_TEST_MODE`≠1이면 404

## 5. UI/UX Design

### 5.1 Screen Layout
PRD 5.5 SCR-001·002·009 레이아웃 그대로. 공통: `global-nav` → 본문 → `footer`.

### 5.2 User Flow
PRD 5.2 사이트맵.

### 5.3 Component List
`components/GlobalNav.tsx`(NAV-01~06), `AppShell.tsx`, `Footer.tsx`, `app/login/LoginForm.tsx`, `app/fleet/FleetTable.tsx`, `app/fleet/AdminReset.tsx`.

### 5.4 Page UI Checklist

| 화면 | 요소 |
|---|---|
| SCR-001 | EL-01~07 |
| SCR-002 | EL-01~12 (EL-10~12 관리자만), 행 셀 키 id·name·type·built·pending·maxGrade·planStatus |
| SCR-009 | EL-01~02 |
| 전역 | NAV-01~06, FOOTER-NOTICE |

## 6. Error Handling

### 6.1 Error Code Definition
401 unauthorized·invalid_credentials, 403 forbidden, 404(테스트 API 비활성).

### 6.2 Error Response Format
`{ "error": "<code>" }`

## 7. Security Considerations
bcrypt(cost 10), 세션 토큰 32바이트·SHA-256 해시 저장, HttpOnly·SameSite=Lax, `safeNext`, `Cache-Control: no-store`, 서버 `localhost` 바인딩.

## 8. Test Plan (v2.3.0)

### 8.1 Test Scope
SC-001, SC-003, SC-005~010 (PRD v1.5 배치).

### 8.2 L1: API Test Scenarios
test/reset 404(시연 서버), admin/reset 403(검사원) — E2E에 포함.

### 8.3 L2: UI Action Test Scenarios
검색·칩 필터·빈 상태(SC-009·010).

### 8.4 L3: E2E Scenario Test Scenarios
로그인·만료·접근 거부·로그아웃(SC-001·003·005·006·007), KPI·표(SC-008).

### 8.5 Seed Data Requirements
`data/seed`(seed 20261001), E2E는 `data/e2e.db`.

## 9. Clean Architecture

### 9.1 Layer Structure
Presentation(`app`, `components`) → Application(`lib/auth`, `lib/queries`) → Infrastructure(`lib/db`, `lib/seed-core`, `db/`).

### 9.2 Dependency Rules
`components`는 `lib/db`를 import하지 않는다. 클라이언트 컴포넌트는 `server-only` 모듈을 import하지 않는다.

## 11. Implementation Guide

### 11.1 Order
1. 마이그레이션·시드 2. 인증·가드 3. 레이아웃 4. 로그인 5. 선대 현황 6. 테스트 API

### 11.3 Session Guide
단일 세션(module-1: 전체).

## Version History

| 버전 | 날짜 | 내용 |
|---|---|---|
| 1.0 | 2026-10-13 | 최초 작성(Option C) |
