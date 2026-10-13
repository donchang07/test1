# inspection-review — KR Smart RBI feature PRD

| 항목 | 값 |
|---|---|
| 정본 | `docs/PRD.md` v1.2 |
| 성격 | 파생본 — 직접 편집 금지. 정본 수정 후 `node scripts/derive-feature-prds.mjs`로 재생성 |
| 순서·의존 | 2 · auth-fleet |
| 규모 | M |
| 첫 명령 | `/pdca plan inspection-review` |

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
| 2 | `inspection-review` | SCR-003, SCR-004, NAV-11~15 | FR-011~019 | SC-012~018 | DATA-002~005, 011 | auth-fleet | M |

### 4.1 화면 인벤토리

| ID | 화면 | 화면 유형 | Route | 접근 | 기능 단계 |
|---|---|---|---|---|---|
| SCR-003 | 선박 개요 | 상세 | `/vessels/[vesselId]` | 검사원·관리자 | 파이프라인 허브 |
| SCR-004 | ① 검사 판독 | 작업 | `/vessels/[vesselId]/review` | 검사원·관리자 | 자동화 |

### 4.2 메뉴

| ID | 위치·순서 | 라벨 | 노출 역할 | 대상 | 데스크톱 | 모바일(≤833px) | 활성 규칙 |
|---|---|---|---|---|---|---|---|
| NAV-11 | 선박 하위 내비 1 | 개요 | 검사원·관리자 | SCR-003 | `sub-nav-frosted` 링크 | 가로 스크롤 칩 | 현재 Route |
| NAV-12 | 선박 하위 내비 2 | ① 판독 | 검사원·관리자 | SCR-004 | 링크 + 미검토 수 배지 | 가로 스크롤 칩 | 현재 Route |
| NAV-13 | 선박 하위 내비 3 | ② 예측 | 검사원·관리자 | SCR-005 | 링크 | 가로 스크롤 칩 | 현재 Route |
| NAV-14 | 선박 하위 내비 4 | ③ 시뮬레이션 | 검사원·관리자 | SCR-006 | 링크 | 가로 스크롤 칩 | 현재 Route |
| NAV-15 | 선박 하위 내비 5 | ④ 계획 | 검사원·관리자 | SCR-007 | 링크 | 가로 스크롤 칩 | 현재 Route |

역할 라벨: `inspector` → `검사원`, `admin` → `관리자`. 활성 메뉴는 `aria-current="page"`.

### 4.3 인증

- 인증 사용: **예** — 관리자 기능(승인·설정·초기화)과 보호 데이터(검사 결과)가 있다.
- 방식: **Supabase Auth** 이메일·비밀번호 `[확정]`. 세션은 `@supabase/ssr` 쿠키(HttpOnly, SameSite=Lax)로 서버·미들웨어가 읽는다. 공개 회원가입은 끈다(시드 계정만). `[기본값]` 세션 유효 8시간 — 로그인 시각 기준으로 미들웨어가 판정하고 초과하면 로그아웃 처리한다.
- 역할: `public.profiles.role`(`inspector`/`admin`). 화면 분기와 API 검사 모두 이 값을 쓰고, DB는 RLS로 한 번 더 막는다(NFR-02).
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

#### SCR-003 선박 개요

| 항목 | 내용 |
|---|---|
| 화면 유형 | 상세(파이프라인 허브) |
| Route | `/vessels/[vesselId]` |
| 대상·권한 | 검사원·관리자 |
| 목적 | 선박 제원과 4단계 진행 상태를 보고 다음 단계로 이동 |
| 진입 | SCR-002 행, NAV-11 |
| 종료·전이 | EL-07 → 다음 단계 화면, NAV-12~15 |
| 관련 | US-01 · FR-011 · SC-012 · DATA-002, 005, 009, 010 |
| 디자인 참고 | REF-02 `product-tile-dark` 선박명 히어로 + 4단계 카드 가로 배열 |

| 요소 ID | 종류 | 컴포넌트 | 라벨·표시값 | 노출 | 조건 | 데이터 | 입력·검증 | 행동·결과 |
|---|---|---|---|---|---|---|---|---|
| SCR-003-EL-01 | 히어로 | `product-tile-dark` | `{선박명}` / `{vesselId} · {선종}` | 전체 | 선박 존재 | DATA-002 | — | — |
| SCR-003-EL-02 | 카드 | `store-utility-card` | `건조 {builtYear}` `총톤수 {grossTonnage}` `선급부호 {classNotation}` `다음 정기검사 {nextSpecialSurveyDue}` | 전체 | 선박 존재 | DATA-002 | — | — |
| SCR-003-EL-03 | 단계 카드 | `store-utility-card` | `① 판독` / `미검토 {n}건` 또는 `모두 검토됨` 또는 `이미지 없음` | 전체 | 항상 | DATA-005 | — | 클릭 → SCR-004 |
| SCR-003-EL-04 | 단계 카드 | `store-utility-card` | `② 예측` / `미검토 판독 {n}건 미반영` 또는 `최신` | 전체 | 항상 | DATA-005 | — | 클릭 → SCR-005 |
| SCR-003-EL-05 | 단계 카드 | `store-utility-card` | `③ 시뮬레이션` / `최근 실행 {YYYY-MM-DD HH:mm}` 또는 `미실행` | 전체 | 항상 | DATA-009 | — | 클릭 → SCR-006 |
| SCR-003-EL-06 | 단계 카드 | `store-utility-card` | `④ 계획` / 계획 상태 라벨 또는 `없음` | 전체 | 항상 | DATA-010 | — | 클릭 → SCR-007 |
| SCR-003-EL-07 | 버튼 | `button-primary` | 다음 단계 규칙: 미검토>0 → `판독 시작하기`(SCR-004) / 시뮬레이션 없음 → `시뮬레이션 실행하기`(SCR-006) / 계획 없음 또는 반려 → `검사 계획 만들기`(SCR-007) / 그 외 → `계획 보기`(SCR-007) | 전체 | 선박 존재 | DATA-005, 009, 010 | — | 해당 화면 이동 |
| SCR-003-EL-08 | 빈 상태 | `inline-alert`(error) | `선박을 찾을 수 없습니다.` + `text-link` `선대 현황으로`(testid `SCR-003-EL-08-back`) | 전체 | 없는 vesselId | 정적 | — | → SCR-002 |

| 상태 | 정의 | 검증 SC |
|---|---|---|
| 초기·성공 | EL-01~07 표시 | SC-012 |
| 로딩 | 해당 없음 — 서버 렌더링 | — |
| 빈 | 없는 vesselId → HTTP 404 + EL-08 | SC-012 |
| 검증 오류 | 해당 없음 — 입력 없음 | — |
| 시스템 오류 | 공통 오류 페이지 `일시적인 오류입니다. 잠시 후 다시 시도하세요.`(testid `ERROR-PAGE`) | SC-012 |
| 권한 없음 | 미인증 → SCR-001 | SC-004 |
| 오프라인 | 해당 없음 — 서버 렌더링 페이지는 브라우저 오프라인 화면이 대신 표시됨 | — |

반응형: 단계 카드 4열 → 834px 미만 2열 → 640px 미만 1열.

---

#### SCR-004 ① 검사 판독

| 항목 | 내용 |
|---|---|
| 화면 유형 | 작업 |
| Route | `/vessels/[vesselId]/review` |
| 대상·권한 | 검사원·관리자 |
| 목적 | AI 판독 결과를 사람이 확정·수정·기각하고 되돌린다(11.4 AI 판정 계약) |
| 진입 | SCR-003 EL-03/EL-07, NAV-12, SCR-005 EL-02 |
| 종료·전이 | EL-19 → SCR-005 |
| 관련 | US-01 · FR-012~019, FR-035 · SC-013~018 · DATA-004, 005, 011 |
| 디자인 참고 | REF-03 카드 그리드: `store-utility-card` 안 1:1이 아닌 16:11 이미지, 아래 텍스트·`button-pearl-capsule` 3개 |

레이아웃: global-nav → sub-nav → 요약(EL-01) + 필터 칩(EL-02) + 보고서 버튼(EL-16) → 카드 그리드(EL-03, 데스크톱 3열/834px 미만 2열/640px 미만 1열) → 보고서 패널(EL-17) → CTA(EL-19) → footer.

| 요소 ID | 종류 | 컴포넌트 | 라벨·표시값 | 노출 | 조건 | 데이터 | 입력·검증 | 행동·결과 |
|---|---|---|---|---|---|---|---|---|
| SCR-004-EL-01 | 요약 | 텍스트(body-strong) | `전체 {n}건 · 미검토 {a}건 · 확정 {b}건 · 기각 {c}건` | 전체 | 판독 1건 이상 | DATA-005 | — | — |
| SCR-004-EL-02 | 칩 그룹 | `configurator-option-chip` | `미검토` `확정` `기각` `전체` (testid `SCR-004-EL-02-{pending\|confirmed\|rejected\|all}`) | 전체 | 기본 `미검토` | DATA-005.humanDecision | 단일 선택 | EL-03 필터 |
| SCR-004-EL-03 | 카드 | `store-utility-card` | testid `SCR-004-EL-03-{findingId}`, findingId 오름차순. 결정 후에도 화면을 다시 불러오거나 칩을 바꾸기 전까지 카드 위치 유지. 이미지(alt `{imageId} 합성 검사 이미지`), `{부재명}`, `AI: {라벨} · 심각도 {n} · 신뢰도 {p}%`(하위 testid `-ai`), 사람 결정 시 `판정: {라벨} · 심각도 {n}`(하위 `-human`), 상태 `status-badge`(하위 `-status`: `미검토`/`확정`/`기각`) | 전체 | 필터 일치 | DATA-004, 005, DATA-003.name | — | — |
| SCR-004-EL-04 | 버튼 | `button-pearl-capsule` | `확정` (testid `SCR-004-EL-04-{findingId}`) | 전체 | pending 이고 aiStatus=completed | — | — | FR-013 |
| SCR-004-EL-05 | 버튼 | `button-pearl-capsule` | `수정` (testid `SCR-004-EL-05-{findingId}`) | 전체 | pending | — | — | EL-07 열기 |
| SCR-004-EL-06 | 버튼 | `button-pearl-capsule` | `기각` (testid `SCR-004-EL-06-{findingId}`) | 전체 | pending 이고 aiStatus=completed | — | — | FR-015 |
| SCR-004-EL-07 | 시트 | `modal-sheet` | 제목 `판정 수정` | 전체 | EL-05 클릭 | — | — | — |
| SCR-004-EL-08 | 칩 그룹 | `configurator-option-chip` | `부식` `균열` `도장 손상` `결함 아님` (testid `SCR-004-EL-08-{corrosion\|crack\|coating_breakdown\|none}`) | 전체 | 시트 열림 | DATA-005.humanLabel | 필수, 기본값 = AI 라벨(실패 시 선택 없음) | — |
| SCR-004-EL-09 | 칩 그룹 | `configurator-option-chip` | `1` `2` `3` (testid `SCR-004-EL-09-{n}`) | 전체 | 라벨 ≠ 결함 아님 | DATA-005.humanSeverity | 필수(결함 아님이면 없음), 기본값 = AI 심각도 | — |
| SCR-004-EL-10 | 버튼 | `button-primary` | `저장` | 전체 | 시트 열림 | — | 라벨 미선택 시 비활성 | FR-014 |
| SCR-004-EL-11 | 버튼 | `button-secondary-pill` | `취소` | 전체 | 시트 열림 | — | — | 시트 닫기, 변경 없음 |
| SCR-004-EL-12 | 버튼 | `text-link` | `검토 취소` (testid `SCR-004-EL-12-{findingId}`) | 전체 | confirmed 또는 rejected | — | — | FR-016 |
| SCR-004-EL-13 | 알림 | `inline-alert`(warning) | `AI 판독에 실패했습니다. 수동으로 판정하세요.` (testid `SCR-004-EL-13-{findingId}`) | 전체 | aiStatus=failed 이고 pending | DATA-005.aiStatus | — | — |
| SCR-004-EL-14 | 빈 상태 | `inline-alert`(info) | `등록된 검사 이미지가 없습니다.` | 전체 | 선박 이미지 0건 | 정적 | — | — |
| SCR-004-EL-15 | 토스트 | `toast` | `판독 결과를 저장했습니다.` | 전체 | 결정·취소 저장 성공 | 정적 | — | — |
| SCR-004-EL-16 | 버튼 | `button-secondary-pill` | `보고서 초안 만들기` | 전체 | 확정 1건 이상이면 활성 | — | — | FR-018 |
| SCR-004-EL-17 | 패널 | `store-utility-card` + 읽기 전용 텍스트 블록(`<pre>`, 복사 가능) | 제목 `판독 보고서 초안(합성)` 본문은 11.4.5 형식 | 전체 | EL-16 실행 후 | DATA-005, 003 | — | — |
| SCR-004-EL-18 | 알림 | `inline-alert`(error) | `저장하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.` | 전체 | 저장 실패 | 정적 | — | 카드 상태 변경 없음 |
| SCR-004-EL-19 | 버튼 | `button-primary` | `열화 예측 보기` | 전체 | 항상 | — | — | → SCR-005 |
| SCR-004-EL-20 | 빈 상태 | `inline-alert`(info) | `이 조건에 해당하는 판독이 없습니다.` | 전체 | 필터 결과 0건(이미지는 있음) | 정적 | — | — |

| 상태 | 정의 | 검증 SC |
|---|---|---|
| 초기 | 칩 `미검토`, 미검토 카드 | SC-013 |
| 로딩 | 저장 중 해당 카드 버튼 비활성 | SC-013 |
| 빈 | 이미지 0건 → EL-14 / 필터 0건 → EL-20 | SC-016, SC-015 |
| 성공 | EL-15, 카드 상태·요약 갱신 | SC-013, SC-014, SC-015 |
| 검증 오류 | EL-10 비활성(라벨 미선택) | SC-017 |
| 시스템 오류 | EL-18 | SC-018 |
| 권한 없음 | 미인증 → SCR-001 | SC-004 |
| 오프라인 | EL-18 | SC-018 |

반응형·접근성: 버튼 높이 44px 이상, 시트는 포커스 트랩·Esc 닫기, 이미지 alt 필수.

---

## 5. 기능 요구사항

우선순위: `P0 (High)` 필수, `P1 (Medium)` MVP 포함 권장, `P2 (Low)` 여유 시.

| ID | 판정 가능한 요구사항 | 우선순위 | 시나리오 | 화면·요소 | 데이터 | 관련 SC | 검증 방법 |
|---|---|---|---|---|---|---|---|
| FR-011 | 선박 개요는 제원과 4단계 상태 카드, 5.5 규칙의 다음 단계 버튼을 표시하고 없는 선박은 404 + EL-08이다 | P0 (High) | US-01 | SCR-003-EL-01~08 | DATA-002, 005, 009, 010 | SC-012 | [E2E] 카드 문구·CTA 이동·404 |
| FR-012 | 판독 화면은 선박의 판독을 카드로 표시하고 상태 칩으로 필터하며 요약 수를 표시한다 | P0 (High) | US-01 | SCR-004-EL-01~03, EL-20 | DATA-004, 005 | SC-013, SC-016 | [E2E] 요약 수가 시드와 일치 |
| FR-013 | `확정`은 AI 라벨·심각도를 사람 판정값으로 복사해 `confirmed`로 저장한다 | P0 (High) | US-01 | SCR-004-EL-04, EL-15 | DATA-005 | SC-013 | [E2E] 확정 후 상태·미검토 수 |
| FR-014 | `수정`은 사람이 고른 라벨·심각도·메모로 `confirmed` 저장(라벨 `결함 아님`이면 `rejected`)하고 AI 원래 값은 보존한다 | P0 (High) | US-01 | SCR-004-EL-05, 07~11 | DATA-005 | SC-014, SC-017 | [E2E] 균열·3으로 수정 → `-human`·`-ai` 둘 다 표시 |
| FR-015 | `기각`은 `rejected`로 저장하고 예측에 반영하지 않는다 | P0 (High) | US-01 | SCR-004-EL-06 | DATA-005 | SC-015 | [E2E] 기각 → 상태 `기각` |
| FR-016 | `검토 취소`는 사람 판정값을 비우고 `pending`으로 되돌린다 | P0 (High) | US-01 | SCR-004-EL-12 | DATA-005 | SC-015 | [E2E] 기각 → 검토 취소 → `미검토` |
| FR-017 | AI 실패 판독은 EL-13을 표시하고 `확정`·`기각` 없이 `수정`으로만 판정한다 | P0 (High) | US-01 | SCR-004-EL-05, EL-13 | DATA-005.aiStatus | SC-017 | [E2E] KR-SYN-010 실패 카드 |
| FR-018 | 보고서 초안은 확정 판독을 11.4.5 형식 텍스트로 만든다 | P1 (Medium) | US-01 | SCR-004-EL-16, 17 | DATA-003, 005 | SC-014 | [E2E] 초안에 확정 부재명 포함 |
| FR-019 | 판독 결정·취소, 계획 상태 변경, 설정 변경마다 감사 로그(누가·언제·무엇·이전→이후)를 남긴다 | P0 (High) | US-01, US-05, US-06 | SCR-008-EL-11 | DATA-011 | SC-031 | [E2E] 설정 저장 후 이력 행 표시 · [통합] 판독 결정 시 로그 1건 |

### 5.1 비기능 요구사항

| ID | 분류 | 요구사항 | 측정 방법 |
|---|---|---|---|
| NFR-01 | 성능 | 프로덕션 빌드에서 SCR-002~007 서버 응답 1초 이내, 시뮬레이션·최적화 API 500ms 이내(합성 12척 기준) | [E2E] 응답 시간 측정 |
| NFR-02 | 보안 | 비밀번호는 Supabase Auth가 관리(앱은 저장하지 않음). 모든 public 테이블 RLS 활성: 로그인 사용자 읽기, 쓰기는 역할별 정책(모델 설정·승인·초기화는 admin). `SUPABASE_SECRET_KEY`는 서버 코드에서만 읽고 `NEXT_PUBLIC_` 접두사 금지·클라이언트 번들 포함 금지. 모든 변경 API는 서버에서 역할 재검사 | [통합] 검사원 세션으로 승인 API 403 · [단위] 빌드 산출물에 비밀 키 문자열 없음 |
| NFR-03 | 접근성 | P0 화면에서 자동 접근성 검사 심각(critical·serious) 위반 0건, 키보드만으로 US-01·US-04 완료 | [E2E] `@axe-core/playwright` 검사 |
| NFR-04 | 반응형 | 1280×800, 390×844 두 뷰포트에서 가로 스크롤 없음, 모바일에서 NAV-06 사용 | [E2E] `desktop` 프로젝트(1280×800)는 전체 스위트, `mobile` 프로젝트(390×844)는 `@mobile` 태그(SC-033) |
| NFR-05 | 실행 검증 | E2E 공통 조건: Chromium, 프로덕션 빌드(로컬·CI `npm run start:e2e`), 운영 Supabase 프로젝트(합성 데이터 전용), `APP_TEST_MODE=1`(로컬·CI 서버만), `E2E_ALLOW_SHARED_DB=1`, `workers=1`(공유 DB), 각 테스트 전 `POST /api/test/reset` | [E2E] `playwright.config.ts` · global setup |
| NFR-06 | 테스트 식별자 | 요소 ID = `data-testid`. 반복 요소 `{요소 ID}-{레코드 ID}`, 셀 `{행 testid}-{열 키}`. E2E 셀렉터는 `getByTestId`만 사용 | [단위] `npm run prd:check`가 테스트의 testid가 PRD에 있는지 확인 |
| NFR-07 | 상태 유도 | 시드: `data/seed` + `/api/test/reset`. 세션 만료: `/api/test/expire-session`. 저장 실패: `context.setOffline(true)`(그래서 저장 동작은 클라이언트 fetch로 구현하고 실패를 화면 알림으로 처리) | [E2E] 각 SC에서 사용 |
| NFR-08 | 재현성 | 같은 시드·파라미터면 같은 계산 결과. 기준일은 시스템 시계가 아니라 `meta.asOfDate` | [단위] 생성기 결정성 테스트 + 기준 모델 일치 |
| NFR-09 | 데이터 표기 | 모든 화면 footer에 합성 데이터 고지 | [E2E] `FOOTER-NOTICE` 존재 |

---

## 6. 완료 판정 기준

| ID | 기준 | 관련 FR·화면 | 측정 방법 | 현재 데이터로 검증 가능 |
|---|---|---|---|---|
| SC-012 | KR-SYN-003 개요: EL-03 `미검토 {n}건`, EL-05 `미실행`, EL-07 `판독 시작하기` → SCR-004. `/vessels/KR-SYN-999` → EL-08 | FR-011 · SCR-003 | [E2E] 카드·CTA·404 | 예 |
| SC-013 | 미검토 판독 `확정` → 카드 `-status` `확정`, EL-01 미검토 1 감소, EL-15 표시 | FR-012, FR-013 · SCR-004 | [E2E] KR-SYN-001 첫 미검토 카드 | 예 |
| SC-014 | KR-SYN-003 균열 판독 `수정` → `균열`·`3` 저장 → `-human` `판정: 균열 · 심각도 3`, `-ai` 유지. 보고서 초안에 부재명 포함 | FR-014, FR-018 · SCR-004 | [E2E] 수정 저장·초안 | 예 |
| SC-015 | `기각` → `기각` → `검토 취소` → `미검토`. 필터 `기각` 0건이면 EL-20 | FR-015, FR-016 · SCR-004 | [E2E] 왕복 | 예 |
| SC-016 | KR-SYN-007 판독 화면 → EL-14 | FR-012 · SCR-004 | [E2E] 빈 상태 | 예 |
| SC-017 | KR-SYN-010 실패 판독: EL-13 표시, EL-04·06 없음, `수정`에서 라벨 미선택 시 저장 비활성 → `부식`·`2` 저장 → `확정` | FR-014, FR-017 · SCR-004 | [E2E] 실패 카드 수동 판정 | 예 |
| SC-018 | 오프라인 상태에서 `확정` → EL-18, 카드 상태 `미검토` 유지 | FR-035 · SCR-004 | [E2E] `setOffline(true)` | 예 |

---

## 7. 오류·경계 처리

| 상황 | 발생 화면·요소 | 사용자 표시 문구 | 이후 동작 | 데이터·로그 |
|---|---|---|---|---|
| 권한 없음(API) | 해당 없음 — API | JSON `{ "error": "forbidden" }` 403 | — | 서버 로그 |
| 없는 선박 | SCR-003-EL-08 | `선박을 찾을 수 없습니다.` | 선대 현황 링크 | — |
| 판독 이미지 없음 | SCR-004-EL-14 | `등록된 검사 이미지가 없습니다.` | 예측 화면은 실측만으로 계산 | — |
| AI 판독 실패 | SCR-004-EL-13 | `AI 판독에 실패했습니다. 수동으로 판정하세요.` | 수정만 허용 | aiStatus=failed 유지 |
| 판독 동시 수정(이미 다른 사용자가 결정) | SCR-004-EL-18 변형 | `다른 사용자가 이미 판정했습니다. 화면을 새로 고칩니다.` | 409 응답 후 카드 새로 고침 | 감사 로그 미기록 |
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
| 스택 | Next.js(App Router) + TypeScript, Route Handlers API `[기본값]` · **호스팅 Vercel** `[확정]` · **DB·인증 Supabase**(Postgres + Auth, `@supabase/ssr`, `@supabase/supabase-js`) `[확정]`. 스키마는 `supabase/migrations/*.sql`로 관리, 시드는 `npm run db:seed`(`data/seed` → Supabase) |
| Supabase 프로젝트 | **운영용 1개만** 사용 `[확정·사용자 결정 2026-10-13]` — 테스트 전용 프로젝트를 만들지 않는다. Vercel Production·Preview·로컬·CI가 같은 프로젝트를 쓴다. 근거: 저장 데이터가 전부 합성(NG-1)이라 시드로 되돌려도 잃을 실데이터가 없다. 대가: E2E·초기화를 실행하면 앱에서 한 판독·시뮬레이션·계획이 시드 상태로 돌아간다. 실데이터를 넣는 시점(v1)에는 테스트 프로젝트 분리가 선행 조건이다 |
| 패키지 관리 | npm |

### 11.1 테스트

| 항목 | 값 |
|---|---|
| 단위 테스트 | Node 내장 테스트 러너 — `npm run test:unit` (`tests/unit/**/*.test.mjs`) |
| E2E | **Playwright** — `npm run test:e2e` (`tests/e2e/**/*.spec.ts`, 설정 `playwright.config.ts`) |
| PRD 연결 검사 | `npm run prd:check` — E2E가 쓰는 testid가 모두 PRD에 정의되어 있는지 확인 |
| E2E 서버 | 로컬·CI: `npm run start:e2e` = 프로덕션 빌드 후 `APP_TEST_MODE=1`로 3000번 포트 기동(구현 시 package.json에 추가), 운영 Supabase에 접속. 실행 전 `E2E_ALLOW_SHARED_DB=1`로 운영 DB 초기화에 동의해야 시작한다(global setup이 확인). 배포된 앱(Vercel)에는 테스트 API가 없으므로 E2E는 로컬·CI 서버를 대상으로만 돈다 |
| 기준 모델 | `tests/reference/model.mjs` — 11.4 공식의 기준 구현(오라클). 앱 코드가 import하지 않는다 |
| 합성 데이터 | `npm run seed:generate` → `data/seed/*.json`, `public/synthetic/inspection/*.svg` (seed 20261001) |

테스트 계정·시드

| 역할 | 계정 | 비밀번호 | 시드 방법 |
|---|---|---|---|
| 비로그인 | 해당 없음 | 해당 없음 | 쿠키 없는 브라우저 컨텍스트 |
| 일반 사용자 | `inspector1@synthetic.example`(검사원 A), `inspector2@synthetic.example`(검사원 B) | 환경 변수 `SEED_INSPECTOR_PASSWORD` | `npm run db:seed`·`/api/test/reset`이 `data/seed/users.json`으로 Supabase Auth 사용자와 `profiles`를 만들거나 비밀번호를 재설정 |
| 관리자 | `admin1@synthetic.example`(검사기획 관리자) | 환경 변수 `SEED_ADMIN_PASSWORD` | 같음 |

### 11.2 시스템 가정

| # | 칸 | 상태 | 내용 |
|---|---|---|---|
| 1 | 데이터 저장 위치와 수명 | [확정] | Supabase Postgres(부록 A 테이블). 초기화 전까지 유지. 실데이터 저장 금지. 리전은 서울(ap-northeast-2) `[기본값]` |
| 2 | 로그인·열람·편집 주체와 권한 | [확정] | 4.1 역할표 |
| 3 | 호스팅·배포 환경 | [확정] | Vercel. Production = 기본 브랜치, Preview = 그 밖의 브랜치·PR. 함수 리전은 Supabase와 가까운 서울(icn1) `[기본값]` |
| 4 | 시간대·로케일 | [기본값] | Asia/Seoul, ko-KR. 계산 기준일은 `meta.asOfDate`(2026-10-01) |
| 5 | 통화·환율·기준일 | [해당 없음] | 비용은 검사 시간(시간)으로만 다룸 |
| 6 | 지원 언어 | [확정] | 한국어 |
| 7 | 콘텐츠 출처와 권한 | [확정] | 검사 이미지는 생성기가 만든 SVG(저작권 문제 없음). 디자인 문서는 MIT(`docs/DESIGN.NOTICE.md`) |
| 8 | 외부 서비스 실패 시 동작 | [기본값] | Supabase 응답 실패·시간 초과(5초) → 화면은 `ERROR-PAGE`, 저장 동작은 각 화면 오류 알림(FR-035). 재시도는 사용자가 수동. 폰트는 self-host |
| 9 | 성능·용량·접근성 | [기본값] | NFR-01·03·04 |
| 10 | 수치·외부 사실의 출처와 기준일 | [기본값] | 모델 수치(허용 쇠모율 20%, 보정계수 0.2 등)는 `[가설]` 시연값. 부록 B |

### 11.3 환경 변수 계약

값은 어떤 파일·문서·채팅에도 적지 않는다. 저장소에는 이름만 있는 `.env.example`을 둔다. Supabase 프로젝트는 운영용 1개다(11장).

| 변수 | 비밀 여부 | 읽는 곳 | Vercel(Production·Preview) | 로컬 `.env.local`·CI·Claude 클라우드 세션 | 넣는 방법 |
|---|---|---|---|---|---|
| `SUPABASE_URL` | 공개 | 서버, 빌드 시 `NEXT_PUBLIC_SUPABASE_URL`로 노출 | 등록 | 등록 | Supabase Vercel 통합이 자동 등록 / 환경 설정 |
| `SUPABASE_PUBLISHABLE_KEY` | 공개(RLS가 보호) | 서버, 빌드 시 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`로 노출 | 등록 | 등록 | 같음 |
| `SUPABASE_SECRET_KEY` | **비밀·서버 전용** | 서버(초기화·시드·관리 API) | 등록(Sensitive) | 등록 | 같음 |
| `SEED_INSPECTOR_PASSWORD` · `SEED_ADMIN_PASSWORD` | 비밀 | `npm run db:seed`·`/api/test/reset`·E2E 로그인 | 등록하지 않음 | 등록 | 환경 설정·CI secret |
| `APP_TEST_MODE` | 공개 | 서버 | **등록 금지**(Production·Preview 모두) | `1`(E2E 서버 기동 시) | `npm run start:e2e`가 설정 |
| `E2E_ALLOW_SHARED_DB` | 공개 | Playwright global setup | — | `1`(운영 DB 초기화 동의) | 실행 시 지정 |
| `E2E_BASE_URL` | 공개 | Playwright | — | 비움(로컬 서버) | — |

이름 규칙

- 공개 값은 Supabase Vercel 통합이 넣는 이름(`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`)을 정본으로 쓰고, `next.config.ts`의 `env`에서 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`로 브라우저에 넘긴다. `NEXT_PUBLIC_*`가 이미 있으면 그 값을 우선한다.
- 비밀 키는 `SUPABASE_SECRET_KEY`(`sb_secret_…`)만 쓴다. 구형 `SUPABASE_SERVICE_ROLE_KEY`·`SUPABASE_ANON_KEY`(JWT)는 읽지 않는다.
- `SUPABASE_SECRET_KEY`는 `next.config.ts` `env`에 넣지 않는다(넣으면 브라우저 번들에 들어간다).

넣는 경로: Vercel은 Supabase 통합 또는 `vercel env add`, 로컬은 `vercel link` → `vercel env pull .env.local`(`.env*`는 gitignore), Claude 클라우드 세션은 환경 설정의 환경 변수, CI는 저장소 secret. Claude 클라우드 세션에서 시드·E2E를 실행하려면 환경의 네트워크 허용 도메인에 Supabase 프로젝트 호스트(`*.supabase.co`)가 있어야 한다.

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
| D-2 | **확정(v1.1)** | 저장소·호스팅 | Supabase + Vercel (사용자 결정 2026-10-13) | — | — | 11장, FR-009·010, NFR-02·05, 부록 A |
| D-3 | **확정(v1.1)** | 인증 방식 | Supabase Auth 이메일·비밀번호 + 시드 계정. KR SSO는 NG-7 유지 | — | — | 5.4, NG-7 |
| D-5 | **확정(v1.2)** | Supabase 프로젝트 구성 | 운영용 1개만, 테스트 전용 없음(사용자 결정 2026-10-13) | — | — | 11장, 11.3, NFR-05. 실데이터 도입 시 재결정 |
| D-4 | 미결 | MVP 목표일 | 날짜 지정 | — | 날짜 없이 feature 순서대로 진행 | 10장 |

Blocker 없음: D-1~D-4 모두 fallback으로 P0 설계가 바뀌지 않는다.

---

## 11. bkit 실행 계약

| 항목 | 값 |
|---|---|
| bkit 버전 | `[검증 기준]` 설치본·`bkit.config.json` 미확인. 설치 후 로컬 계약을 우선하고 차이를 부록 B에 기록 |
| 설정 | `bkit.config.json`의 `matchRateThreshold` 90 `[검증 기준]` |
| PM 단계 | `/pdca pm` 생략 — 이 PRD가 PM/PRD 역할을 대체 |
| 명령 순서(feature마다) | `/pdca plan {feature}` → `/pdca design {feature}` → `/pdca do {feature}` → `/pdca analyze {feature}` → (미달 시 `/pdca iterate {feature}`) → `/pdca report {feature}` |
| 첫 명령 | `/pdca plan auth-fleet` |
| Check 단계 테스트 | `/pdca analyze`에서 `npm run test:unit` · `npm run test:e2e` · `npm run prd:check`를 실제로 실행하고 결과를 analysis 문서에 기록 |
| 완료 조건 | 두 관문 모두 통과: ① match rate 90% 이상 ② 11.1 테스트 명령 전체 통과(해당 feature 범위의 E2E 포함). gap-detector는 테스트를 실행하지 않으므로 match rate만으로 완료 판정하지 않는다 |

---

## 부록 A. 데이터 계약(이 feature)

### DATA-002 선박 (`vessels.json`)

| 필드 | 타입 | 필수 | 기본값 | 검증·제약 | 읽기 | 쓰기 | 출처 |
|---|---|---|---|---|---|---|---|
| vesselId | string | 예 | — | `KR-SYN-\d{3}` | SCR-002-EL-08, SCR-003-EL-01 | 시드 | [가설] |
| name | string | 예 | — | — | SCR-002-EL-08, SCR-003-EL-01, sub-nav | 시드 | [가설] |
| shipType | enum(벌크선, 유조선, 컨테이너선) | 예 | — | — | SCR-002-EL-07·08, SCR-003-EL-01 | 시드 | [가설] |
| builtYear | int | 예 | — | 2008~2016 | SCR-002-EL-08, SCR-003-EL-02 | 시드 | [가설] |
| grossTonnage | int | 예 | — | — | SCR-003-EL-02 | 시드 | [가설] |
| classNotation | string | 예 | — | — | SCR-003-EL-02 | 시드 | [가설] |
| nextSpecialSurveyDue | date | 예 | — | — | SCR-003-EL-02 | 시드 | [가설] |
| dataLabel | string | 예 | `합성` | 항상 `합성` | footer | 시드 | [확정] |

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

### DATA-011 감사 로그 (`audit-log.json`)

| 필드 | 타입 | 필수 | 기본값 | 검증·제약 | 읽기 | 쓰기 | 출처 |
|---|---|---|---|---|---|---|---|
| auditId | string | 예 | — | 고유 | SCR-008-EL-11 | 서버 | — |
| actor | string | 예 | — | userId | SCR-008-EL-11 | 서버 | — |
| action | enum(finding.decide, finding.revert, plan.request, plan.approve, plan.reject, params.update, data.reset) | 예 | — | — | SCR-008-EL-11(params.update만) | 서버 | — |
| target | string | 예 | — | ID | 같음 | 서버 | — |
| before / after | object | 예 | — | 변경 필드만 | 같음 | 서버 | — |
| at | datetime | 예 | — | — | 같음 | 서버 | — |
