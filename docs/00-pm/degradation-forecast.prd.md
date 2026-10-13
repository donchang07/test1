# degradation-forecast — KR Smart RBI feature PRD

| 항목 | 값 |
|---|---|
| 정본 | `docs/PRD.md` v1.4 |
| 성격 | 파생본 — 직접 편집 금지. 정본 수정 후 `node scripts/derive-feature-prds.mjs`로 재생성 |
| 순서·의존 | 3 · inspection-review |
| 규모 | S |
| 첫 명령 | `/pdca plan degradation-forecast` |

## 0. Context Anchor

| 축 | 내용 |
|---|---|
| WHY | 정기 검사는 선박 상태와 무관하게 범위·주기가 고정되어 비용과 정박 시간이 크고, 위험 부위를 놓칠 수 있다. 판독·예측·시뮬레이션·계획이 분리되어 근거가 이어지지 않는다 |
| WHO | KR 검사원(일반 사용자), KR 검사기획 관리자(관리자) |
| RISK | 검사 범위 축소가 안전 책임과 직결된다 → 고위험 부재는 항상 필수 포함, AI 결과는 사람이 확정해야만 반영 |
| SUCCESS | 4단계가 한 선박에서 끊김 없이 이어지고, 모든 수치가 기준 모델(오라클)과 일치하며, E2E 전체 통과 |
| SCOPE | 웹 MVP, 합성 데이터 12척, 로그인·역할 2종, 4단계 화면 + 대시보드 + 관리자 설정 |

---

## 1. 비목표(정본 3.2 전체)

| ID | 이번에 만들지 않을 것 | 제외 이유 | 다시 검토할 시점 |
|---|---|---|---|
| NG-1 | 실제 선박·KR 시스템 데이터 연동(선급 DB, AIS, 센서 스트림) | 데이터 권한·보안 협의 전. MVP는 합성 데이터로 계약 검증 | 파일럿 데이터 협약 체결 후 |
| NG-2 | 실제 비전 AI 모델 학습·추론 | 모델 성능 검증은 별도 과제. MVP는 합성 AI 결과로 사람 확정 흐름을 검증 | 라벨링 데이터 확보 후 |
| NG-3 | 유한요소해석(FEA) 수준 구조 해석 | 계산 비용·전문 검증 필요. MVP는 11.4 단순 지수 모델 | v1 이후 KR 기술센터 협의 |
| NG-4 | 검사원 배치·출장 경로 최적화(요구사항 O-4) | 다른 최적화 문제. 이번에는 기항지 1곳 추천만 | v1 |
| NG-5 | 선주·외부 사용자 포털 | 권한 모델 확장 필요 | v1 이후 |
| NG-6 | 공식 검사 보고서·증서 발행 | 법적 효력 문서는 기존 시스템 소관. MVP는 보고서 초안 텍스트만 | 범위 밖 유지 |
| NG-7 | KR SSO·외부 IdP 연동 | 13장 D-3 결정 전 | D-3 결정 후 |
| NG-8 | 다국어 UI | 사용자 전원 한국어 | v1 이후 |
| NG-9 | 클라우드 배포(Vercel 등)·관리형 DB(Supabase 등) | 사용자 결정(2026-10-13): MVP는 localhost에서만 실행 | 여러 사람이 원격으로 써야 할 때 |

---

## 2. 역할

| 역할 | 설명 | 열람 | 행동 |
|---|---|---|---|
| 비로그인 | 계정이 없거나 로그인 전 | SCR-001만 | 로그인 |
| 일반 사용자(검사원, `inspector`) | KR 검사원 | SCR-002~007, SCR-009 | 판독 결정, 시뮬레이션 실행, 최적화 실행, 계획 검토 요청 |
| 관리자(검사기획, `admin`) | KR 검사기획 담당 | 전체 화면 | 검사원 행동 전부 + 계획 승인·반려, 모델 설정 변경, 합성 데이터 초기화 |

## 3. 시나리오(정본 전체)

| ID | 사용자 | 상황 | 목표 | 흐름 | 완료 조건(Given/When/Then) |
|---|---|---|---|---|---|
| US-01 | 검사원 | 드론 영상의 AI 판독이 쌓여 있음 | 판독을 확정·수정·기각 | SCR-001 → SCR-002 → SCR-003 → SCR-004 | Given 미검토 판독, When 확정, Then 상태 `확정`·미검토 수 1 감소·감사 로그 기록 |
| US-02 | 검사원 | 판독 확정 후 열화 상황 파악 | 부재별 교체 도달 연도 확인 | SCR-004 → SCR-005 | Given 확정된 부식 판독, When 예측 화면 진입, Then 보정계수와 부식 속도가 11.4 공식값과 일치 |
| US-03 | 검사원 | 다음 운항 항로가 거칠다 | 3년 후 위험 비교 | SCR-005 → SCR-006 | Given 조건 선택, When 실행, Then 위험점수·등급이 11.4 공식값과 일치하고 이력에 저장 |
| US-04 | 검사원 | 다음 기항지에서 검사 예정 | 예산 안에서 검사 계획 작성 후 검토 요청 | SCR-006 → SCR-007 | Given 시뮬레이션 결과, When 최적화, Then `높음` 부재 전부 포함·예산 이하·기항지 추천, When 검토 요청, Then 상태 `검토 요청` |
| US-05 | 관리자 | 검토 요청된 계획 | 승인 또는 반려 | SCR-002 → SCR-007 | Given `검토 요청`, When 승인, Then `승인됨`·최적화 잠금 / When 반려(사유), Then `반려됨`·검사원에게 사유 표시 |
| US-06 | 관리자 | 허용 쇠모율 기준 변경 | 모델 설정 갱신 | SCR-008 → SCR-005 | Given 25% 저장, When 예측 화면, Then 교체 기준 두께 재계산, 기존 시뮬레이션 결과는 불변 |
| US-07 (실패) | 검사원 | 예산이 너무 작음 | 계획 생성 시도 | SCR-007 | Given 필수 시간 > 예산, When 최적화, Then 계획 미생성·필요 시간 안내 |
| US-08 (실패) | 검사원 | 관리자 화면 URL 직접 입력 | 설정 접근 | SCR-009 | Given 검사원 세션, When `/admin/settings`, Then SCR-009 표시 |
| US-09 (이탈) | 검사원 | 장시간 자리 비움 | 작업 재개 | SCR-001 | Given 세션 만료, When 화면 이동, Then `/login?reason=expired`·만료 안내 |

---

## 4. 화면 계약

### 4.0 이 feature 범위

## 14. feature 분해

| 순서 | feature 슬러그 | 포함 화면·메뉴 | FR | SC | 데이터 | 의존 | 규모 |
|---|---|---|---|---|---|---|---|
| 3 | `degradation-forecast` | SCR-005 | FR-020~023 | SC-019~022 | DATA-003, 004, 005, 008 | inspection-review | S |

### 4.1 화면 인벤토리

| ID | 화면 | 화면 유형 | Route | 접근 | 기능 단계 |
|---|---|---|---|---|---|
| SCR-005 | ② 열화 예측 | 분석 | `/vessels/[vesselId]/forecast` | 검사원·관리자 | 예측 |

### 4.2 메뉴

| ID | 위치·순서 | 라벨 | 노출 역할 | 대상 | 데스크톱 | 모바일(≤833px) | 활성 규칙 |
|---|---|---|---|---|---|---|---|

역할 라벨: `inspector` → `검사원`, `admin` → `관리자`. 활성 메뉴는 `aria-current="page"`.

### 4.3 인증

- 인증 사용: **예** — 관리자 기능(승인·설정·초기화)과 보호 데이터(검사 결과)가 있다.
- 방식: 자체 이메일·비밀번호 인증 `[확정]`. 비밀번호는 bcrypt 해시로 SQLite `users`에 저장, 로그인 시 무작위 세션 토큰(32바이트)을 발급해 해시만 `sessions`에 저장하고 원문은 HttpOnly·SameSite=Lax 쿠키로 준다. 공개 회원가입 없음(시드 계정만). `[기본값]` 세션 유효 8시간(`sessions.expires_at`).
- 역할: `users.role`(`inspector`/`admin`). 화면 분기와 모든 API가 서버에서 이 값을 검사한다(NFR-02).
- 보호 경로: `/fleet`, `/vessels/*`, `/admin/*`, `/forbidden`, `/api/*`(단 테스트 모드 API 제외).
- 만료 판정: 인증 쿠키가 있는데 세션이 무효(만료·폐기)이면 `reason=expired`, 쿠키가 없으면 일반 미인증으로 본다.
- 미인증 접근: `/login?next={원래 경로}`로 이동. `next`는 `/`로 시작하는 내부 경로만 허용하고 그 외에는 `/fleet`.
- 세션 만료: 다음 요청에서 `/login?reason=expired`로 이동하고 SCR-001-EL-06 표시.
- 권한 없음: 화면은 SCR-009로 이동, API는 403 JSON `{ "error": "forbidden" }`.
- 로그아웃: 세션 삭제 후 `/login`. 브라우저 뒤로 가기로 보호 화면 내용을 다시 볼 수 없다(`Cache-Control: no-store`).

### 4.4 공통 규칙과 화면별 상세 계약

공통 규칙

- 요소 ID는 `data-testid` 값이다. 반복 요소는 `{요소 ID}-{레코드 ID}`, 표 셀은 `{행 testid}-{열 키}`를 쓴다.
- 숫자 표기: 두께 `mm` 소수 2자리, 부식 속도 소수 3자리(`mm/년`), 연도 소수 1자리, 지수(CI·피로·PoF) 소수 2자리, 위험점수 정수, 커버리지 소수 1자리 + `%`, 시간은 소수 최대 1자리 + `시간`(예: `38.5시간`, `40시간`).
- 날짜는 `YYYY-MM-DD`, 시간대는 `Asia/Seoul`.
- 모든 인증 화면 상단에 `global-nav`(NAV-01~06), 선박 화면(SCR-003~007) 은 그 아래 `sub-nav-frosted`(NAV-11~15).
- 하단 `footer`에 고지 문구 `모든 데이터는 합성 데이터이며 실제 선박·선급 기록이 아닙니다.`(SCR-001-EL-07과 같은 문구, testid `FOOTER-NOTICE`).

---

#### SCR-005 ② 열화 예측

| 항목 | 내용 |
|---|---|
| 화면 유형 | 분석 |
| Route | `/vessels/[vesselId]/forecast` (쿼리 `sort`, `member`) |
| 대상·권한 | 검사원·관리자 |
| 목적 | 부재별 부식 속도와 교체 기준 도달 연도를 본다(11.4.2) |
| 진입 | NAV-13, SCR-004 EL-19, SCR-003 EL-04 |
| 종료·전이 | EL-08 → SCR-006 |
| 관련 | US-02, US-06 · FR-020~023 · SC-019~022, SC-031 · DATA-003, 004, 005, 008 |
| 디자인 참고 | REF-04 표 + 우측 상세 패널(차트). 834px 미만은 패널이 표 아래 |

| 요소 ID | 종류 | 컴포넌트 | 라벨·표시값 | 노출 | 조건 | 데이터 | 입력·검증 | 행동·결과 |
|---|---|---|---|---|---|---|---|---|
| SCR-005-EL-01 | 알림 | `inline-alert`(warning) | `미검토 AI 판독 {n}건은 예측에 반영되지 않았습니다.` | 전체 | pending ≥ 1 | DATA-005 | — | — |
| SCR-005-EL-02 | 링크 | `text-link` | `판독하러 가기` | 전체 | EL-01 표시 | — | — | → SCR-004 |
| SCR-005-EL-03 | 표 | `data-table` | 행 testid `SCR-005-EL-03-{memberId}`. 열: `부재`(name) `구역`(zone) `원설계`(t0) `최근 실측`(last, `{두께} ({날짜})`) `교체 기준`(renewal) `부식 속도`(rate) `판독 보정`(factor, `×1.00`) `교체 도달`(renewalYear, 없으면 `도달 안 함`) `데이터`(status: `정상`/`데이터 부족`) | 전체 | 항상 | DATA-003, 004, 005, 008 | — | 행 클릭 → `member` 선택, EL-05 갱신 |
| SCR-005-EL-04 | 칩 그룹 | `configurator-option-chip` | `교체 도달 빠른 순`(testid `SCR-005-EL-04-renewal`) `부재 순`(testid `SCR-005-EL-04-member`) | 전체 | 기본 `교체 도달 빠른 순` | — | 단일 선택 | EL-03 정렬. 빠른 순: renewalYear 오름차순, `도달 안 함`은 마지막, 같으면 memberId |
| SCR-005-EL-05 | 패널 | `store-utility-card` | `{부재명}` + EL-06 | 전체 | 선택 부재 있음(기본: 정렬 첫 행) | DATA-003 | — | — |
| SCR-005-EL-06 | 차트 | `chart-line` | x: 연도(최초 실측 ~ 기준일+5년), y: mm. 실측 점, 예측선(점선), 교체 기준 수평선. 범례 `실측` `예측` `교체 기준` | 전체 | EL-05 표시 | DATA-004, 11.4.2 | — | — |
| SCR-005-EL-07 | 배지 | `status-badge`(warning) | `데이터 부족` (셀 `-status` 안) | 전체 | 실측 < 2회 | DATA-004 | — | 툴팁 `실측이 1회뿐이라 기본 부식 속도 {r} mm/년을 적용했습니다.` |
| SCR-005-EL-08 | 버튼 | `button-primary` | `시나리오 시뮬레이션으로` | 전체 | 항상 | — | — | → SCR-006 |

| 상태 | 정의 | 검증 SC |
|---|---|---|
| 초기·성공 | 16행, 첫 행 차트 | SC-019 |
| 로딩 | 해당 없음 — 서버 렌더링 | — |
| 빈 | 해당 없음 — 모든 선박은 부재 16개 | — |
| 검증 오류 | 해당 없음 — 입력 없음 | — |
| 시스템 오류 | `ERROR-PAGE` | SC-019 |
| 권한 없음 | 미인증 → SCR-001 | SC-004 |
| 오프라인 | 해당 없음 — 서버 렌더링 | — |

---

## 5. 기능 요구사항

우선순위: `P0 (High)` 필수, `P1 (Medium)` MVP 포함 권장, `P2 (Low)` 여유 시.

| ID | 판정 가능한 요구사항 | 우선순위 | 시나리오 | 화면·요소 | 데이터 | 관련 SC | 검증 방법 |
|---|---|---|---|---|---|---|---|
| FR-020 | 예측 표는 부재 16개의 부식 속도·보정계수·교체 기준·교체 도달 연도를 11.4.2 공식대로 표시한다 | P0 (High) | US-02 | SCR-005-EL-03, 04 | DATA-003, 004, 005, 008 | SC-019, SC-020, SC-022 | [E2E] 셀 값 = 기준 모델 |
| FR-021 | 미검토 판독이 있으면 예측 화면 상단에 EL-01·02를 표시한다 | P0 (High) | US-02 | SCR-005-EL-01, 02 | DATA-005 | SC-021 | [E2E] 경고 표시·이동, 미검토 0이면 미표시 |
| FR-022 | 선택 부재의 실측·예측·교체 기준을 선 차트로 표시한다 | P1 (Medium) | US-02 | SCR-005-EL-05, 06 | DATA-004 | SC-019 | [E2E] 행 클릭 → 패널 부재명 변경 |
| FR-023 | 예측 표를 교체 도달 빠른 순/부재 순으로 정렬한다 | P1 (Medium) | US-02 | SCR-005-EL-04 | — | SC-019 | [E2E] 정렬 후 첫 행 |

### 5.1 비기능 요구사항

| ID | 분류 | 요구사항 | 측정 방법 |
|---|---|---|---|
| NFR-01 | 성능 | 프로덕션 빌드에서 SCR-002~007 서버 응답 1초 이내, 시뮬레이션·최적화 API 500ms 이내(합성 12척 기준) | [E2E] 응답 시간 측정 |
| NFR-02 | 보안 | 비밀번호 bcrypt(cost 10) 해시 저장, 세션 토큰은 해시만 저장, 쿠키 HttpOnly·SameSite=Lax, 모든 변경 API는 서버에서 역할 재검사. 서버는 `127.0.0.1`(localhost)에만 바인딩 | [통합] 검사원 세션으로 승인 API 403 |
| NFR-03 | 접근성 | P0 화면에서 자동 접근성 검사 심각(critical·serious) 위반 0건, 키보드만으로 US-01·US-04 완료 | [E2E] `@axe-core/playwright` 검사 |
| NFR-04 | 반응형 | 1280×800, 390×844 두 뷰포트에서 가로 스크롤 없음, 모바일에서 NAV-06 사용 | [E2E] `desktop` 프로젝트(1280×800)는 전체 스위트, `mobile` 프로젝트(390×844)는 `@mobile` 태그(SC-033) |
| NFR-05 | 실행 검증 | E2E 공통 조건: Chromium, 프로덕션 빌드(`npm run start:e2e`), E2E 전용 DB 파일 `data/e2e.db`(개발 DB `data/app.db`와 분리), `APP_TEST_MODE=1`, `workers=1`(같은 SQLite 파일), 각 테스트 전 `POST /api/test/reset` | [E2E] `playwright.config.ts` |
| NFR-06 | 테스트 식별자 | 요소 ID = `data-testid`. 반복 요소 `{요소 ID}-{레코드 ID}`, 셀 `{행 testid}-{열 키}`. E2E 셀렉터는 `getByTestId`만 사용 | [단위] `npm run prd:check`가 테스트의 testid가 PRD에 있는지 확인 |
| NFR-07 | 상태 유도 | 시드: `data/seed` + `/api/test/reset`. 세션 만료: `/api/test/expire-session`. 저장 실패: `context.setOffline(true)`(그래서 저장 동작은 클라이언트 fetch로 구현하고 실패를 화면 알림으로 처리) | [E2E] 각 SC에서 사용 |
| NFR-08 | 재현성 | 같은 시드·파라미터면 같은 계산 결과. 기준일은 시스템 시계가 아니라 `meta.asOfDate` | [단위] 생성기 결정성 테스트 + 기준 모델 일치 |
| NFR-09 | 데이터 표기 | 모든 화면 footer에 합성 데이터 고지 | [E2E] `FOOTER-NOTICE` 존재 |

---

## 6. 완료 판정 기준

| ID | 기준 | 관련 FR·화면 | 측정 방법 | 현재 데이터로 검증 가능 |
|---|---|---|---|---|
| SC-019 | KR-SYN-001 예측 16행의 `rate`·`factor`·`renewal`·`renewalYear` = 기준 모델, 첫 행 = 교체 도달 가장 빠른 부재, 행 클릭 시 EL-05 제목 변경 | FR-020, FR-022, FR-023 · SCR-005 | [E2E] 기준 모델 비교 | 예 |
| SC-020 | KR-SYN-012-M01 `status` `데이터 부족`, `rate` `0.100` | FR-020 · SCR-005 | [E2E] 셀 확인 | 예 |
| SC-021 | 미검토가 있는 KR-SYN-001에서 EL-01 수 = 미검토 수, EL-02 → SCR-004. KR-SYN-007은 EL-01 없음 | FR-021 · SCR-005 | [E2E] 경고 표시 | 예 |
| SC-022 | KR-SYN-010 부식 판독을 `부식`·`2`로 수정 확정 → 해당 부재 `factor` `×1.40`, `rate` = 기준 모델 | FR-014, FR-020 · SCR-004, 005 | [E2E] 판독 → 예측 연결 | 예 |

---

## 7. 오류·경계 처리

| 상황 | 발생 화면·요소 | 사용자 표시 문구 | 이후 동작 | 데이터·로그 |
|---|---|---|---|---|
| 권한 없음(API) | 해당 없음 — API | JSON `{ "error": "forbidden" }` 403 | — | 서버 로그 |
| 실측 1회 | SCR-005-EL-07 | `데이터 부족` | 기본 부식 속도 적용 | — |
| 부식 속도 0 | SCR-005-EL-03 `renewalYear` | `도달 안 함` | 시뮬레이션에서 CI=두께 기준 | — |
| 이미 교체 기준 이하 | SCR-005-EL-03 | 마지막 실측 연도 표시 | 시뮬레이션 CI=0 | — |
| 잘못된 상태 전이(예: 초안 승인) | 해당 없음 — API | 409 `{ "error": "invalid_transition" }` | — | 서버 로그 |
| 테스트 API 비활성 환경 호출 | 해당 없음 — API | 404 | — | — |

---

## 8. 브랜드·디자인

### 9.1 시각 시스템

- 디자인 기준: `docs/DESIGN.md` — `[확정]` 사용자 지정 “Apple DESIGN.md”. 출처는 VoltAgent/awesome-design-md의 Apple 분석 문서(MIT, `docs/DESIGN.NOTICE.md`). Apple 공식 문서가 아니다.
- 폰트: **Pretendard**. DESIGN.md의 SF Pro 지정은 따르지 않고 같은 크기·굵기·자간 계층을 Pretendard에 적용한다. 굵기 단계 300/400/600/700, 500 사용 금지(DESIGN.md 규칙 유지).
- 단일 강조색 Action Blue `#0066cc`(어두운 타일 위 `#2997ff`). 상태 의미 색은 아래 9.3 확장 토큰으로만 쓰고 버튼·링크에는 쓰지 않는다.
- 그림자는 쓰지 않는다(제품 사진 없음). 카드 구분은 `hairline` 1px 테두리.
- 버튼 누름 상태는 `transform: scale(0.95)`.

### 9.2 토큰 요약(DESIGN.md 발췌)

| 토큰 | 값 | 용도 |
|---|---|---|
| colors.primary | #0066cc | 버튼·링크·포커스 |
| colors.ink | #1d1d1f | 본문 |
| colors.canvas / canvas-parchment | #ffffff / #f5f5f7 | 배경 교대 |
| colors.surface-tile-1 | #272729 | SCR-003 히어로 |
| colors.hairline | #e0e0e0 | 카드·표 테두리 |
| typography.display-lg | 40px/600/1.1 | 화면 제목 |
| typography.body | 17px/400/1.47/-0.374px | 본문·표 |
| typography.caption | 14px/400 | 보조 정보 |
| rounded.pill / lg / sm | 9999 / 18 / 8px | 버튼·칩 / 카드 / 유틸리티 |
| spacing.section | 80px(모바일 48px) | 히어로 상하 여백 |

### 9.3 컴포넌트 목록

구현은 아래 이름만 사용한다. `[DESIGN.md]`는 원문 컴포넌트, `[확장]`은 DESIGN.md Known Gaps(폼 검증·오류 상태 미정의)를 메우려고 이 PRD가 정의한 컴포넌트다.

| 컴포넌트 | 출처 | 규칙 |
|---|---|---|
| global-nav | [DESIGN.md] | 검정 44px, 834px 미만 NAV-06 |
| sub-nav-frosted | [DESIGN.md] | 선박명 + NAV-11~15 |
| button-primary | [DESIGN.md] | 화면당 주요 행동 1개 원칙 |
| button-secondary-pill | [DESIGN.md] | 보조 행동 |
| button-dark-utility | [DESIGN.md] | 로그아웃 |
| button-pearl-capsule | [DESIGN.md] | 카드 안 행동(확정·수정·기각) |
| button-icon-circular | [DESIGN.md] | NAV-06, 시트 닫기 |
| text-link | [DESIGN.md] | 보조 이동 |
| product-tile-light / product-tile-parchment / product-tile-dark | [DESIGN.md] | 화면 제목·히어로 영역 |
| store-utility-card | [DESIGN.md] | KPI, 판독 카드, 요약·패널 |
| configurator-option-chip(-selected) | [DESIGN.md] | 모든 단일 선택 칩. `<button>`으로 구현하고 선택 상태는 `aria-pressed="true"` |
| search-input | [DESIGN.md] | SCR-002 검색 |
| floating-sticky-bar | [DESIGN.md] | SCR-007 상태·승인 바 |
| footer | [DESIGN.md] | 합성 데이터 고지 |
| text-input | [확장] | search-input과 같은 높이 44px, `rounded.sm`, 1px hairline, 라벨은 caption-strong 위쪽 |
| data-table | [확장] | 헤더 caption-strong, 행 body, 행 구분 hairline, 숫자 오른쪽 정렬 |
| status-badge | [확장] | pill, caption. 높음 `#b42318`/배경 `#fef3f2`, 중간 `#b54708`/`#fffaeb`, 낮음 `#067647`/`#ecfdf3`, 중립 ink-muted-80/parchment. 색만으로 구분하지 않고 텍스트 병기 |
| inline-alert | [확장] | `rounded.sm`, 좌측 4px 막대(error/warning/info 색은 status-badge와 같은 계열), `role="alert"`(error)·`role="status"`(그 외) |
| toast | [확장] | 하단 중앙, ink 배경·흰 글씨, 4초 후 사라짐, `role="status"` |
| modal-sheet | [확장] | canvas 배경, `rounded.lg`, 포커스 트랩, Esc 닫기 |
| chart-line | [확장] | 선 primary, 교체 기준선 `#b42318` 점선, 축 caption |
| zone-map | [확장] | 구역 타일 그리드, 등급 텍스트 + status-badge 색 |

### 9.4 참고 레퍼런스

| ID | 참고 대상 | 참고할 점 | 따라 하지 않을 점 | 적용 화면 |
|---|---|---|---|---|
| REF-01 | DESIGN.md `product-tile-parchment` + `store-utility-card` | 넓은 여백, 중앙 단일 카드 | 제품 이미지·그림자 | SCR-001, SCR-009 |
| REF-02 | DESIGN.md 홈 타일 교대 리듬 | 밝은/어두운 타일 교대로 구획 | 화면 1개 = 뷰포트 1개 밀도(업무 화면은 정보 밀도 우선) | SCR-002, SCR-003 |
| REF-03 | DESIGN.md store 그리드 | 카드 그리드 열 수 축소 규칙(3→2→1) | 가격·구매 문구 | SCR-004 |
| REF-04 | DESIGN.md 본문 타이포·hairline | 표·폼의 차분한 위계 | 장식 그라데이션 | SCR-005, SCR-008 |
| REF-05 | DESIGN.md configurator(iPhone 구매 페이지) | 칩 선택 → 결과 갱신 흐름 | 썸네일·가격 차이 표시 | SCR-006 |
| REF-06 | DESIGN.md floating-sticky-bar | 스크롤 중 상태·주요 행동 고정 | 반투명 블러 남용(블러 1곳만) | SCR-007 |

---

## 9. 레벨·스택·시스템 가정

| 항목 | 값 |
|---|---|
| 레벨 | Dynamic(풀스택) `[기본값]` — 로그인·역할·서버 계산·저장이 필요 |
| 스택 | Next.js(App Router) + TypeScript, Route Handlers API `[기본값]` · **실행 환경 localhost**(`http://localhost:3000`) `[확정·사용자 결정 2026-10-13]` · **DB SQLite**(`better-sqlite3`, 파일 `data/app.db`) `[확정·사용자 결정 2026-10-13]`. 스키마는 `db/migrations/*.sql`, 시드는 `npm run db:seed`(`data/seed` → SQLite) |
| DB 파일 | 개발·시연 `data/app.db`, E2E `data/e2e.db`(`DATABASE_PATH`로 지정). 둘 다 gitignore. 앱 시작 시 파일이 없으면 마이그레이션 후 시드를 자동 적용 `[기본값]` |
| 실행 | `npm run dev`(개발) / `npm run build && npm run start`(시연) → 브라우저에서 `http://localhost:3000` |
| 패키지 관리 | npm |

### 11.1 테스트

| 항목 | 값 |
|---|---|
| 단위 테스트 | Node 내장 테스트 러너 — `npm run test:unit` (`tests/unit/**/*.test.mjs`) |
| E2E | **Playwright** — `npm run test:e2e` (`tests/e2e/**/*.spec.ts`, 설정 `playwright.config.ts`) |
| PRD 연결 검사 | `npm run prd:check` — E2E가 쓰는 testid가 모두 PRD에 정의되어 있는지 확인 |
| E2E 서버 | `npm run start:e2e` = 프로덕션 빌드 후 `APP_TEST_MODE=1 DATABASE_PATH=data/e2e.db`로 3000번 포트 기동(구현 시 package.json에 추가). 개발 DB는 건드리지 않는다 |
| 기준 모델 | `tests/reference/model.mjs` — 11.4 공식의 기준 구현(오라클). 앱 코드가 import하지 않는다 |
| 합성 데이터 | `npm run seed:generate` → `data/seed/*.json`, `public/synthetic/inspection/*.svg` (seed 20261001) |

테스트 계정·시드

| 역할 | 계정 | 비밀번호 | 시드 방법 |
|---|---|---|---|
| 비로그인 | 해당 없음 | 해당 없음 | 쿠키 없는 브라우저 컨텍스트 |
| 일반 사용자 | `inspector1@synthetic.example`(검사원 A), `inspector2@synthetic.example`(검사원 B) | 환경 변수 `SEED_INSPECTOR_PASSWORD` | `npm run db:seed`·`/api/test/reset`이 `data/seed/users.json`으로 `users` 행을 만들고 비밀번호 해시를 환경 변수 값으로 설정 |
| 관리자 | `admin1@synthetic.example`(검사기획 관리자) | 환경 변수 `SEED_ADMIN_PASSWORD` | 같음 |

### 11.2 시스템 가정

| # | 칸 | 상태 | 내용 |
|---|---|---|---|
| 1 | 데이터 저장 위치와 수명 | [확정] | 로컬 SQLite 파일(`data/app.db`, 부록 A 테이블). 초기화 전까지 유지. 실데이터 저장 금지 |
| 2 | 로그인·열람·편집 주체와 권한 | [확정] | 4.1 역할표 |
| 3 | 호스팅·배포 환경 | [확정] | localhost 단일 Node 프로세스. 배포 없음(NG-9) |
| 4 | 시간대·로케일 | [기본값] | Asia/Seoul, ko-KR. 계산 기준일은 `meta.asOfDate`(2026-10-01) |
| 5 | 통화·환율·기준일 | [해당 없음] | 비용은 검사 시간(시간)으로만 다룸 |
| 6 | 지원 언어 | [확정] | 한국어 |
| 7 | 콘텐츠 출처와 권한 | [확정] | 검사 이미지는 생성기가 만든 SVG(저작권 문제 없음). 디자인 문서는 MIT(`docs/DESIGN.NOTICE.md`) |
| 8 | 외부 서비스 실패 시 동작 | [해당 없음] | 외부 서비스 호출 없음. 폰트는 `pretendard` 패키지로 self-host. DB 오류는 `ERROR-PAGE`·각 화면 오류 알림(FR-035) |
| 9 | 성능·용량·접근성 | [기본값] | NFR-01·03·04 |
| 10 | 수치·외부 사실의 출처와 기준일 | [기본값] | 모델 수치(허용 쇠모율 20%, 보정계수 0.2 등)는 `[가설]` 시연값. 부록 B |

### 11.3 환경 변수 계약

localhost 실행이므로 외부 서비스 키는 없다. 값은 커밋·채팅·문서에 쓰지 않는다. 저장소에는 이름만 있는 `.env.example`을 두고, 실제 값은 프로젝트 루트의 `.env.local`(Next.js가 자동으로 읽음, gitignore)에 둔다.

| 변수 | 비밀 여부 | 읽는 곳 | 기본값 | 넣는 방법 |
|---|---|---|---|---|
| `DATABASE_PATH` | 공개 | 서버 | `data/app.db` | 보통 비워 둠. `npm run start:e2e`가 `data/e2e.db`로 지정 |
| `SEED_INSPECTOR_PASSWORD` · `SEED_ADMIN_PASSWORD` | 비밀 | `npm run db:seed`·`/api/test/reset`·E2E 로그인 | 없음(필수) | `.env.local` 또는 셸 환경 변수. Claude 클라우드 세션은 환경 설정의 환경 변수 |
| `APP_TEST_MODE` | 공개 | 서버 | 비어 있음(꺼짐) | `npm run start:e2e`만 `1`로 설정. 시연 서버에는 넣지 않음 |
| `E2E_BASE_URL` | 공개 | Playwright | `http://localhost:3000` | 다른 포트로 띄웠을 때만 |

`.env.local`은 Next.js가 읽지만 Playwright와 `npm run db:seed`는 읽지 않으므로, 두 명령은 `node --env-file-if-exists=.env.local`로 실행한다(구현 시 package.json 스크립트에 반영).

### 11.4 AI 판정 계약과 계산 공식

#### 11.4.1 파라미터 기본값(DATA-008)

| 키 | 기본값 | 라벨 |
|---|---|---|
| allowableDiminutionPct | 20 | [가설] 시연값. 실제 허용 쇠모량은 KR 규칙의 부재별 값(D-1) |
| findingFactorPerSeverity | 0.2 | [가설] |
| defaultCorrosionRateMmPerYear | 0.1 | [가설] |
| routeSeverityMultipliers | calm 0.8 · moderate 1.0 · harsh 1.3 | [가설] |
| riskThresholds | high 70 · medium 40 | [가설] |
| defaultBudgetHours | 40 | [가설] |

#### 11.4.2 예측(부재 단위)

- 실측을 날짜순 정렬. 소수 연도 `y(d) = 연도 + (해당 연도 1월 1일부터 경과 일수) / (그해 일수)`.
- 기본 부식 속도 `r0 = max(0, -OLS 기울기(y, 두께))`. 실측 2회 미만이면 `r0 = defaultCorrosionRate`, 데이터 상태 `데이터 부족`.
- 판독 보정 `f = 1 + findingFactorPerSeverity × S`. S = 이 부재의 **사람 확정(confirmed)** 판정 중 라벨 `부식`·`도장 손상`의 최대 심각도, 없으면 0. 미검토·기각은 반영하지 않는다.
- 부식 속도 `r = r0 × f`, 교체 기준 두께 `t_ren = t0 × (1 − allowableDiminutionPct/100)`.
- 교체 도달 연도 `Y = y_last + (t_last − t_ren)/r` (r=0이면 `도달 안 함`). 표시는 `floor(max(Y, y_last) × 10)/10`.

#### 11.4.3 시뮬레이션(조건: 기간 H ∈ {1,3,5}, 해상 배수 s)

- 경과 `Δ = y(asOfDate) + H − y_last`, 예측 두께 `t_pred = t_last − r × s × Δ`.
- 상태지수 `CI = clamp((t_pred − t_ren)/(t0 − t_ren), 0, 1)`.
- 피로 누적 `D = clamp(fatigueUsage + fatigueRatePerYear × s × H, 0, 1)`.
- 파손확률지표 `PoF = 1` (사람 확정 `균열` 판정이 있으면), 아니면 `max(1 − CI, D)`.
- 위험점수 `risk = round(PoF × criticality / 3 × 100)`, 등급 `높음` ≥ high, `중간` ≥ medium, 그 외 `낮음`.
- 실행 결과에는 사용한 파라미터 전체를 스냅샷으로 저장한다(FR-033).

#### 11.4.4 최적화(예산 B 시간)

1. 필수 = 등급 `높음` 전부. 필수 시간 합 > B → infeasible(계획 미저장, 필요 시간 = 필수 합).
2. 나머지는 `risk/hours` 내림차순(같으면 risk 내림차순, memberId 오름차순)으로 risk > 0 이고 예산 안에 들어가면 추가.
3. 커버리지 = 선택 risk 합 / 전체 risk 합 × 100, 소수 1자리 반올림(전체 0이면 100).
4. 기항지 = 기준일 이후 ETA, 검사원 배치 가능, 체류 시간 ≥ 총 선택 시간 중 ETA가 가장 이른 곳.

#### 11.4.5 AI 판정 계약

| 항목 | 내용 |
|---|---|
| AI 기능 | 검사 이미지 결함 판독(라벨·심각도·신뢰도). MVP는 합성 결과(`aiModelVersion=synthetic-vision-0.1`) |
| 입력 | 검사 이미지(DATA-004) |
| 출력 | aiLabel(`corrosion`/`crack`/`coating_breakdown`/`none`), aiSeverity(1~3), aiConfidence(0~1), aiStatus(`completed`/`failed`) |
| 사람 확정 주체·화면 | 검사원 또는 관리자, SCR-004 |
| 확정 전 사용 | 금지. 예측·시뮬레이션·계획은 humanDecision=`confirmed`만 사용 |
| AI 결과와 확정값 분리 | aiLabel/aiSeverity와 humanLabel/humanSeverity는 다른 필드. 확정이 AI 값을 덮어쓰지 않는다 |
| 되돌리기 | `검토 취소`(FR-016) → pending, 감사 로그 기록 |
| AI 실패 시 | aiStatus=`failed`, 사람 수동 판정만 허용(FR-017) |
| 보고서 초안 형식 | 첫 줄 `[합성] {선박명}({vesselId}) 판독 보고서 초안 — 기준일 {asOfDate}`, 이어서 확정 판정마다 `- {부재명}: {라벨} 심각도 {n} (이미지 {imageId})`, 마지막 줄 `미검토 {n}건은 포함되지 않았습니다.` |

---

## 10. 작성자 결정 필요

| # | 상태 | 결정 사항 | 선택지 | 추천값 | fallback(무응답 시) | 연쇄 영향 |
|---|---|---|---|---|---|---|
| D-1 | 미결 | 허용 쇠모율 기준 | ① 전 부재 단일 % ② 부재 유형별 KR 규칙값 | ② (실무 정합) | ① 20% `[가설]` 유지, 설정 화면에서 변경 가능 | DATA-003에 부재별 허용값 필드 추가 시 FR-020 수정 |
| D-2 | **확정(v1.3)** | 저장소·실행 환경 | SQLite + localhost (사용자 결정 2026-10-13, v1.1의 Supabase+Vercel 대체) | — | — | 11장, FR-009·010, NFR-02·05, 부록 A, NG-9 |
| D-3 | **확정(v1.3)** | 인증 방식 | 자체 이메일·비밀번호 + 시드 계정(SQLite). KR SSO는 NG-7 유지 | — | — | 5.4, NG-7 |
| D-5 | 해당 없음(v1.3) | 원격 DB 프로젝트 구성 | 로컬 SQLite 파일로 대체(개발 `app.db`, E2E `e2e.db`) | — | — | 11장 |
| D-4 | 미결 | MVP 목표일 | 날짜 지정 | — | 날짜 없이 feature 순서대로 진행 | 10장 |

Blocker 없음: D-1~D-4 모두 fallback으로 P0 설계가 바뀌지 않는다.

---

## 11. bkit 실행 계약

| 항목 | 값 |
|---|---|
| bkit 버전 | bkit v2.1.40 — 프로젝트 범위 설치(`.claude/settings.json`의 `bkit@bkit-marketplace`), Claude Code 2.1.296 |
| 설정 | `bkit.config.json`의 `pdca.matchRateThreshold` **95** `[확정·사용자 결정 2026-10-13]` (bkit 기본값 90에서 상향) |
| PM 단계 | `/pdca pm` 생략 — 이 PRD가 PM/PRD 역할을 대체 |
| 명령 순서(feature마다) | `/pdca plan {feature}` → `/pdca design {feature}` → `/pdca do {feature}` → `/pdca analyze {feature}` → (미달 시 `/pdca iterate {feature}`) → `/pdca report {feature}` |
| 첫 명령 | `/pdca plan auth-fleet` |
| Check 단계 테스트 | `/pdca analyze`에서 `npm run test:unit` · `npm run test:e2e` · `npm run prd:check`를 실제로 실행하고 결과를 analysis 문서에 기록 |
| 완료 조건 | 두 관문 모두 통과: ① match rate 95% 이상 ② 11.1 테스트 명령 전체 통과(해당 feature 범위의 E2E 포함). gap-detector는 테스트를 실행하지 않으므로 match rate만으로 완료 판정하지 않는다 |

---

## 부록 A. 데이터 계약(이 feature)

### DATA-003 구조 부재 (`members.json`)

| 필드 | 타입 | 필수 | 기본값 | 검증·제약 | 읽기 | 쓰기 | 출처 |
|---|---|---|---|---|---|---|---|
| memberId | string | 예 | — | `{vesselId}-M\d{2}`, 선박당 16개 | SCR-005·006·007 행 | 시드 | [가설] |
| vesselId | string | 예 | — | DATA-002 FK | — | 시드 | [가설] |
| zone | string | 예 | — | 8개 구역 | SCR-005-EL-03, SCR-006-EL-07 | 시드 | [가설] |
| memberType | string | 예 | — | — | SCR-005-EL-05 | 시드 | [가설] |
| name | string | 예 | — | — | SCR-004-EL-03, SCR-005~007 표 | 시드 | [가설] |
| originalThicknessMm | number | 예 | — | > 0 | SCR-005-EL-03 `t0` | 시드 | [가설] |
| criticality | int | 예 | — | 1~3 | SCR-006-EL-06 | 시드 | [가설] |
| inspectionHours | number | 예 | — | > 0, 0.5 단위 | SCR-007-EL-07 | 시드 | [가설] |

### DATA-004 두께 실측·검사 이미지 (`thickness-measurements.json`, `inspection-images.json`)

| 필드 | 타입 | 필수 | 기본값 | 검증·제약 | 읽기 | 쓰기 | 출처 |
|---|---|---|---|---|---|---|---|
| measurement.measurementId | string | 예 | — | 고유 | — | 시드 | [가설] |
| measurement.memberId | string | 예 | — | DATA-003 FK | — | 시드 | [가설] |
| measurement.surveyDate | date | 예 | — | — | SCR-005-EL-03 `last`, EL-06 | 시드 | [가설] |
| measurement.thicknessMm | number | 예 | — | 0 < t ≤ t0, 날짜순 비증가 | SCR-005-EL-03·06 | 시드 | [가설] |
| image.imageId | string | 예 | — | 고유 | SCR-004-EL-03 alt, 보고서 | 시드 | [가설] |
| image.vesselId / memberId | string | 예 | — | FK | SCR-004 | 시드 | [가설] |
| image.imagePath | string | 예 | — | `/synthetic/inspection/*.svg` | SCR-004-EL-03 | 시드 | [가설] |
| image.capturedAt | date | 예 | — | — | SCR-004-EL-03 | 시드 | [가설] |
| image.captureMethod | string | 예 | — | 드론/원격 카메라/검사원 촬영 | SCR-004-EL-03 | 시드 | [가설] |
| image.aiStatus | enum(completed, failed) | 예 | — | — | SCR-004-EL-13 | 시드 | [가설] |

### DATA-005 판독 결과 (`findings.json`)

| 필드 | 타입 | 필수 | 기본값 | 검증·제약 | 읽기 | 쓰기 | 출처 |
|---|---|---|---|---|---|---|---|
| findingId | string | 예 | — | 고유 | SCR-004-EL-03~06·12 testid | 시드 | [가설] |
| imageId / vesselId / memberId | string | 예 | — | FK | SCR-004 | 시드 | [가설] |
| aiStatus | enum | 예 | — | — | SCR-004-EL-13 | 시드 | [가설] |
| aiLabel | enum \| null | 아니오 | — | failed면 null | SCR-004-EL-03 `-ai` | 시드(AI) | [가설] |
| aiSeverity | int \| null | 아니오 | — | 1~3, none이면 null | SCR-004-EL-03 `-ai` | 시드(AI) | [가설] |
| aiConfidence | number \| null | 아니오 | — | 0~1 | SCR-004-EL-03 `-ai` | 시드(AI) | [가설] |
| humanDecision | enum(pending, confirmed, rejected) | 예 | pending | — | SCR-002-EL-03·08, SCR-003, SCR-004, SCR-005-EL-01 | SCR-004-EL-04~06·10·12 | — |
| humanLabel | enum \| null | 아니오 | null | confirmed면 필수 | SCR-004 `-human`, 11.4.2·3 | SCR-004-EL-04·08·10 | — |
| humanSeverity | int \| null | 아니오 | null | confirmed이고 none 아님이면 1~3 | 같음 | SCR-004-EL-04·09·10 | — |
| humanNote | string \| null | 아니오 | null | 0~200자 | SCR-004-EL-03 | SCR-004-EL-07 | — |
| reviewedBy / reviewedAt | string / datetime | 아니오 | null | 결정 시 필수 | SCR-004-EL-03 | 서버 | — |
| version | int | 예(런타임) | 0 | 낙관적 잠금 | 서버 | 서버 | — |

### DATA-008 모델 파라미터 (`model-parameters.json`)

| 필드 | 타입 | 필수 | 기본값 | 검증·제약 | 읽기 | 쓰기 | 출처 |
|---|---|---|---|---|---|---|---|
| version | int | 예 | 1 | 저장마다 +1 | SCR-006-EL-05 | SCR-008-EL-07 | — |
| allowableDiminutionPct | number | 예 | 20 | 5~40 | SCR-005, 006 | SCR-008-EL-01 | [가설] |
| findingFactorPerSeverity | number | 예 | 0.2 | 0~1 | SCR-005-EL-03 `factor` | SCR-008-EL-02 | [가설] |
| defaultCorrosionRateMmPerYear | number | 예 | 0.1 | 0.01~1 | SCR-005-EL-07 | SCR-008-EL-03 | [가설] |
| routeSeverityMultipliers | object | 예 | 0.8/1.0/1.3 | > 0, 설정 화면에서 변경 불가 | 11.4.3 | 시드 | [가설] |
| riskThresholds.high / medium | int | 예 | 70 / 40 | 1~100 / 0~99, medium < high | SCR-006 등급 | SCR-008-EL-04·05 | [가설] |
| defaultBudgetHours | int | 예 | 40 | 4~200 | SCR-007-EL-03 | SCR-008-EL-06 | [가설] |
| updatedBy / updatedAt | string / datetime | 예 | seed | — | SCR-008-EL-11 | 서버 | — |
