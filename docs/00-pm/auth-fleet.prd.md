# auth-fleet — KR Smart RBI feature PRD

| 항목 | 값 |
|---|---|
| 정본 | `docs/PRD.md` v1.7 |
| 성격 | 파생본 — 직접 편집 금지. 정본 수정 후 `node scripts/derive-feature-prds.mjs`로 재생성 |
| 순서·의존 | 1 · 없음 |
| 규모 | M |
| 첫 명령 | `/pdca plan auth-fleet` |

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
| 1 | `auth-fleet` | SCR-001, SCR-002, SCR-009, NAV-01~06, 공통 레이아웃·footer·시스템 페이지(`ERROR-PAGE`·`NOT-FOUND-PAGE`), SQLite 연결·마이그레이션·시드(`db:seed`) | FR-001~010 | SC-001, SC-003, SC-005~010 | DATA-001, 002, 005, 009, 010 | 없음 | M |

### 4.1 화면 인벤토리

| ID | 화면 | 화면 유형 | Route | 접근 | 기능 단계 |
|---|---|---|---|---|---|
| SCR-001 | 로그인 | 인증 | `/login` | 비로그인 | — |
| SCR-002 | 선대 위험 현황 | 목록·대시보드 | `/fleet` | 검사원·관리자 | — |
| SCR-009 | 접근 거부 | 시스템 | `/forbidden` | 로그인 사용자 | — |

### 4.2 메뉴

| ID | 위치·순서 | 라벨 | 노출 역할 | 대상 | 데스크톱 | 모바일(≤833px) | 활성 규칙 |
|---|---|---|---|---|---|---|---|
| NAV-01 | 전역 내비 1 | KR Smart RBI | 검사원·관리자 | SCR-002 | `global-nav` 좌측 텍스트 로고 | 중앙 로고 | 없음 |
| NAV-02 | 전역 내비 2 | 선대 현황 | 검사원·관리자 | SCR-002 | 링크 | NAV-06 트레이 안 | `/fleet`, `/vessels/*` |
| NAV-03 | 전역 내비 3 | 모델 설정 | 관리자만 | SCR-008 | 링크 | NAV-06 트레이 안 | `/admin/*` |
| NAV-04 | 전역 내비 우측 1 | `{표시 이름} · {역할 라벨}` | 검사원·관리자 | 없음(표시) | 텍스트 + `status-badge` | NAV-06 트레이 안 | — |
| NAV-05 | 전역 내비 우측 2 | 로그아웃 | 검사원·관리자 | SCR-001 | `button-dark-utility` | NAV-06 트레이 안 | — |
| NAV-06 | 전역 내비 우측(모바일) | 메뉴 열기 | 검사원·관리자 | NAV-02~05 트레이 | 숨김 | `button-icon-circular` | 트레이 열림 시 `aria-expanded=true` |

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
- 공통 시스템 페이지(화면 인벤토리 밖, 전역 내비 없음, `footer` 있음): 시스템 오류는 `ERROR-PAGE`(8장), 정의되지 않은 경로는 HTTP 404 + `inline-alert`(error) `페이지를 찾을 수 없습니다.`(testid `NOT-FOUND-PAGE`) 안에 링크 `선대 현황으로`(testid `NOT-FOUND-PAGE-back`, → SCR-002. 미인증이면 5.4 규칙대로 로그인으로 이동). 없는 선박은 이 페이지가 아니라 SCR-003-EL-08을 쓴다.

---

#### SCR-001 로그인

| 항목 | 내용 |
|---|---|
| 화면 유형 | 인증 |
| Route | `/login` (쿼리 `next`, `reason=expired`) |
| 대상·권한 | 비로그인. 로그인 상태로 접근하면 `/fleet`로 이동 |
| 목적 | 시드 계정으로 로그인 |
| 진입 | 직접 접근, 미인증 리다이렉트, 세션 만료, 로그아웃 |
| 종료·전이 | 성공 → `next` 또는 SCR-002 |
| 관련 | US-01, US-09 · FR-001~004 · SC-001~005 · DATA-001 |
| 디자인 참고 | REF-01 로그인 단일 카드: `product-tile-parchment` 배경 위 중앙 `store-utility-card` |

레이아웃: 전역 내비 없음 → 본문(중앙 카드: 서비스명 → 입력 2개 → 버튼 → 오류) → `footer`. 모바일은 카드 폭 100%(좌우 16px).

| 요소 ID | 종류 | 컴포넌트 | 라벨·표시값 | 노출 | 조건 | 데이터 | 입력·검증 | 행동·결과 |
|---|---|---|---|---|---|---|---|---|
| SCR-001-EL-01 | 제목 | 텍스트(display-lg) | `KR Smart RBI` | 전체 | 항상 | 정적 | — | — |
| SCR-001-EL-02 | 입력 | `text-input` | 라벨 `이메일` | 전체 | 항상 | DATA-001.email | 필수, 이메일 형식 | — |
| SCR-001-EL-03 | 입력 | `text-input`(password) | 라벨 `비밀번호` | 전체 | 항상 | 해당 없음 — 서버로만 전송 | 필수 | Enter → EL-04 |
| SCR-001-EL-04 | 버튼 | `button-primary` | `로그인` | 전체 | 제출 중 비활성 + `로그인 중…` | — | — | FR-001 |
| SCR-001-EL-05 | 알림 | `inline-alert`(error) | `이메일 또는 비밀번호가 올바르지 않습니다.` | 전체 | 인증 실패 | 정적 | — | — |
| SCR-001-EL-06 | 알림 | `inline-alert`(info) | `세션이 만료되었습니다. 다시 로그인하세요.` | 전체 | `reason=expired` | 정적 | — | — |
| SCR-001-EL-07 | 고지 | 텍스트(fine-print) | `모든 데이터는 합성 데이터이며 실제 선박·선급 기록이 아닙니다.` | 전체 | 항상 | 정적 | — | — |

| 상태 | 정의 | 검증 SC |
|---|---|---|
| 초기 | 빈 입력, EL-04 활성 | SC-001 |
| 로딩 | EL-04 비활성 `로그인 중…` | SC-001 |
| 빈 | 해당 없음 — 목록 없음 | — |
| 성공 | 대상 화면으로 이동 | SC-001, SC-004 |
| 검증 오류 | 빈 칸 제출 시 브라우저 필수 검증, 서버 미호출 | SC-003 |
| 시스템 오류 | EL-05와 같은 위치에 `일시적인 오류입니다. 잠시 후 다시 시도하세요.` | SC-003 |
| 권한 없음 | 해당 없음 — 비로그인 화면 | — |
| 오프라인 | 시스템 오류와 같은 문구 | SC-003 |

반응형·접근성: 입력에 `<label>` 연결, 오류는 `role="alert"`, 포커스 순서 EL-02 → EL-03 → EL-04.

---

#### SCR-002 선대 위험 현황

| 항목 | 내용 |
|---|---|
| 화면 유형 | 목록·대시보드 |
| Route | `/fleet` |
| 대상·권한 | 검사원·관리자 (EL-10·11은 관리자만) |
| 목적 | 선대 전체의 판독 대기·위험·계획 상태를 보고 선박을 고른다 |
| 진입 | 로그인 성공, NAV-01/02, SCR-009 복귀 |
| 종료·전이 | 행 클릭 → SCR-003 |
| 관련 | US-01, US-05 · FR-007~009 · SC-008~011 · DATA-002, 005, 009, 010 |
| 디자인 참고 | REF-02 상단 `product-tile-light` 제목 + KPI 4개 `store-utility-card` 그리드, 아래 `data-table` |

레이아웃: global-nav → 제목 영역(EL-01) → KPI 그리드(EL-02~05, 데스크톱 4열 / 834px 미만 2열 / 640px 미만 1열) → 도구 줄(EL-06 검색, EL-07 칩, 관리자만 EL-10) → 표(EL-08) → footer.

| 요소 ID | 종류 | 컴포넌트 | 라벨·표시값 | 노출 | 조건 | 데이터 | 입력·검증 | 행동·결과 |
|---|---|---|---|---|---|---|---|---|
| SCR-002-EL-01 | 제목 | 텍스트(display-lg) + caption | `선대 위험 현황` / `기준일 {asOfDate}` | 전체 | 항상 | meta.asOfDate | — | — |
| SCR-002-EL-02 | KPI | `store-utility-card` | `관리 선박` / `{n}척` | 전체 | 항상 | count(DATA-002) | — | — |
| SCR-002-EL-03 | KPI | `store-utility-card` | `미검토 판독` / `{n}건` | 전체 | 항상 | count(DATA-005 humanDecision=pending) | — | — |
| SCR-002-EL-04 | KPI | `store-utility-card` | `고위험 부재` / `{n}개` | 전체 | 항상 | 선박별 최신 DATA-009 high 합계, 실행 없으면 0 | — | — |
| SCR-002-EL-05 | KPI | `store-utility-card` | `승인 대기 계획` / `{n}건` | 전체 | 항상 | count(DATA-010 status=review_requested) | — | — |
| SCR-002-EL-06 | 입력 | `search-input` | placeholder `선박명 또는 ID 검색` | 전체 | 항상 | 해당 없음 — 클라이언트 필터 | 공백 제거 후 부분 일치(대소문자 무시) | 입력 즉시 EL-08 필터 |
| SCR-002-EL-07 | 칩 그룹 | `configurator-option-chip` | `전체` `벌크선` `유조선` `컨테이너선` (칩 testid `SCR-002-EL-07-{라벨}`) | 전체 | 기본 `전체` 선택 | DATA-002.shipType | 단일 선택 | EL-08 필터(EL-06과 AND) |
| SCR-002-EL-08 | 표 | `data-table` | 열: `선박 ID`(id) `선박명`(name) `선종`(type) `건조`(built) `미검토 판독`(pending) `최고 위험`(maxGrade) `계획 상태`(planStatus). 행 testid `SCR-002-EL-08-{vesselId}` | 전체 | 결과 1건 이상 | DATA-002, 005, 009, 010 | — | 행 클릭/Enter → SCR-003 |
| SCR-002-EL-09 | 빈 상태 | `inline-alert`(info) | `조건에 맞는 선박이 없습니다.` | 전체 | 필터 결과 0건 | 정적 | — | — |
| SCR-002-EL-10 | 버튼 | `button-secondary-pill` | `합성 데이터 초기화` | 관리자만 | 항상 | — | — | EL-11 열기 |
| SCR-002-EL-11 | 모달 | `modal-sheet` | 제목 `합성 데이터를 초기화할까요?` 본문 `판독·시뮬레이션·계획·설정이 시드 상태로 돌아갑니다.` 버튼 `초기화`(testid `SCR-002-EL-11-confirm`) `취소`(testid `SCR-002-EL-11-cancel`) | 관리자만 | EL-10 클릭 | — | — | FR-009 |
| SCR-002-EL-12 | 토스트 | `toast` | `합성 데이터를 초기화했습니다.` | 관리자만 | 초기화 성공 | 정적 | — | — |

표 셀 표시: `maxGrade`는 최신 시뮬레이션의 최고 등급 `status-badge`(`높음`/`중간`/`낮음`), 실행 없으면 `미실행`. `planStatus`는 최신 계획 상태 라벨(5.5 SCR-007 참조), 없으면 `없음`.

| 상태 | 정의 | 검증 SC |
|---|---|---|
| 초기 | 칩 `전체`, 검색 빈칸, 12행 | SC-008 |
| 로딩 | 서버 렌더링으로 표시 전 로딩 없음 — 해당 없음 | — |
| 빈 | EL-09 | SC-009 |
| 성공 | 필터 적용 행 표시, 초기화 후 EL-12 | SC-010, SC-011 |
| 검증 오류 | 해당 없음 — 자유 입력 검색 | — |
| 시스템 오류 | 초기화 실패 시 모달 안 `inline-alert` `초기화하지 못했습니다. 다시 시도하세요.`(testid `SCR-002-EL-11-error`) | SC-011 |
| 권한 없음 | 검사원에게 EL-10·11 미노출, API 403 | SC-011 |
| 오프라인 | 시스템 오류와 동일 | SC-011 |

반응형·접근성: 640px 미만에서 표는 `건조`·`선종` 열을 숨기고 가로 스크롤 없음. 행은 `role="link"`, 키보드 Enter 지원.

---

#### SCR-009 접근 거부

| 항목 | 내용 |
|---|---|
| 화면 유형 | 시스템 |
| Route | `/forbidden` (HTTP 403) |
| 대상·권한 | 로그인 사용자 |
| 목적 | 권한 없는 화면 접근을 알리고 복귀 경로 제공 |
| 관련 | US-08 · FR-006 · SC-006 |
| 디자인 참고 | REF-01 중앙 정렬 `product-tile-parchment` |

| 요소 ID | 종류 | 컴포넌트 | 라벨·표시값 | 노출 | 조건 | 데이터 | 입력·검증 | 행동·결과 |
|---|---|---|---|---|---|---|---|---|
| SCR-009-EL-01 | 제목 | 텍스트(display-lg) | `이 화면에 접근할 권한이 없습니다.` | 로그인 사용자 | 항상 | 정적 | — | — |
| SCR-009-EL-02 | 버튼 | `button-primary` | `선대 현황으로` | 로그인 사용자 | 항상 | — | — | → SCR-002 |

| 상태 | 정의 | 검증 SC |
|---|---|---|
| 초기·성공 | EL-01·02 | SC-006 |
| 로딩·빈·검증 오류·시스템 오류·오프라인 | 해당 없음 — 정적 화면 | — |
| 권한 없음 | 이 화면 자체가 권한 없음 상태 | SC-006 |

---

## 5. 기능 요구사항

우선순위: `P0 (High)` 필수, `P1 (Medium)` MVP 포함 권장, `P2 (Low)` 여유 시.

| ID | 판정 가능한 요구사항 | 우선순위 | 시나리오 | 화면·요소 | 데이터 | 관련 SC | 검증 방법 |
|---|---|---|---|---|---|---|---|
| FR-001 | 시드 계정 이메일·비밀번호가 맞으면 세션을 만들고 `next`(내부 경로만) 또는 `/fleet`로 이동한다 | P0 (High) | US-01 | SCR-001-EL-02~04 | DATA-001 | SC-001, SC-002, SC-004 | [E2E] 역할별 로그인 → 대상 화면 도착 |
| FR-002 | 인증 실패 시 계정 존재 여부를 드러내지 않는 같은 문구(EL-05)를 표시한다 | P0 (High) | US-01 | SCR-001-EL-05 | DATA-001 | SC-003 | [E2E] 틀린 비밀번호·없는 이메일 모두 같은 문구 |
| FR-003 | 보호 경로 미인증 접근은 `/login?next={경로}`로 보내고 로그인 후 원래 경로로 복귀한다 | P0 (High) | US-09 | SCR-001 | 해당 없음 — 라우팅 | SC-004 | [E2E] 미인증 선박 화면 접근 → 로그인 → 복귀 |
| FR-004 | 세션이 만료되면 다음 이동에서 `/login?reason=expired`로 보내고 EL-06을 표시한다 | P0 (High) | US-09 | SCR-001-EL-06 | DATA-001(session) | SC-005 | [E2E] 테스트 API로 만료 → 이동 → 안내 |
| FR-005 | 로그아웃하면 세션을 삭제하고 `/login`으로 보내며 보호 응답은 `Cache-Control: no-store`다 | P0 (High) | — | NAV-05 | DATA-001(session) | SC-007 | [E2E] 로그아웃 → 보호 경로 재접근 시 로그인 화면 |
| FR-006 | 검사원이 관리자 화면에 접근하면 SCR-009, 관리자 API는 403을 반환한다. NAV-03·SCR-002-EL-10·SCR-007-EL-13/14는 관리자에게만 렌더링한다 | P0 (High) | US-08 | SCR-009, NAV-03 | DATA-001.role | SC-001, SC-006, SC-011, SC-030 | [E2E] 검사원 `/admin/settings` → 접근 거부 |
| FR-007 | 선대 화면은 KPI 4개와 선박 12척 표를 데이터와 일치하게 표시한다 | P0 (High) | US-01 | SCR-002-EL-01~05, EL-08 | DATA-002, 005, 009, 010 | SC-008 | [E2E] KPI·행 수·미검토 셀이 시드와 일치 |
| FR-008 | 검색어(부분 일치)와 선종 칩(AND)으로 표를 필터하고 0건이면 EL-09를 표시한다 | P0 (High) | US-01 | SCR-002-EL-06, 07, 09 | DATA-002 | SC-009, SC-010 | [E2E] 검색·칩 필터 결과 수 |
| FR-009 | 관리자는 확인 모달을 거쳐 SQLite의 업무 테이블을 `data/seed` 내용으로 되돌릴 수 있다(한 트랜잭션, 사용자·세션은 유지) | P1 (Medium) | — | SCR-002-EL-10~12 | 전체 DATA | SC-011 | [E2E] 판독 확정 → 초기화 → 미검토 복귀 |
| FR-010 | `APP_TEST_MODE=1`일 때만 `POST /api/test/reset`(업무 테이블 시드 복원 + 시드 계정 비밀번호를 환경 변수 값으로 재설정)과 `POST /api/test/expire-session`(현재 세션의 `expires_at`을 과거로 변경)을 제공하고, 그 외에는 404다 | P0 (High) | — | 해당 없음 — 테스트 상태 유도 API | 전체 DATA | SC-005, NFR-07 | [통합] 테스트 모드 on/off 응답 코드 |

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
| NFR-09 | 데이터 표기 | 모든 화면 footer에 합성 데이터 고지(SCR-001~009와 공통 시스템 페이지 `ERROR-PAGE`·`NOT-FOUND-PAGE` 포함) | [E2E] `FOOTER-NOTICE` 존재 |

---

## 6. 완료 판정 기준

| ID | 기준 | 관련 FR·화면 | 측정 방법 | 현재 데이터로 검증 가능 |
|---|---|---|---|---|
| SC-001 | 검사원 로그인 → SCR-002 도착, NAV-04 `검사원 A · 검사원`, NAV-03 없음 | FR-001, FR-006 · SCR-001, 002 | [E2E] 검사원 로그인 후 내비 확인 | 예 |
| SC-003 | 틀린 비밀번호·없는 이메일 → 같은 EL-05 문구, URL `/login` 유지 | FR-002 · SCR-001 | [E2E] 두 경우 문구 비교 | 예 |
| SC-005 | 세션 만료 후 이동 → `/login?reason=expired` + EL-06 | FR-004, FR-010 · SCR-001 | [E2E] `/api/test/expire-session` 후 이동 | 예 |
| SC-006 | 검사원 `/admin/settings` → SCR-009, EL-02 → SCR-002 | FR-006 · SCR-009 | [E2E] 직접 URL 접근 | 예 |
| SC-007 | 로그아웃 → `/login`, 보호 경로 재접근 시 `/login?next=…` | FR-005 · NAV-05 | [E2E] 로그아웃 후 재접근 | 예 |
| SC-008 | KPI 관리 선박 12척·미검토 판독 수 = 시드 pending 수, 표 12행, 각 행 `pending` 셀 = 선박별 시드 값 | FR-007 · SCR-002 | [E2E] 시드 비교 | 예 |
| SC-009 | 검색 `칼립소` → 1행(KR-SYN-003), `없는선박` → EL-09 | FR-008 · SCR-002 | [E2E] 검색 | 예 |
| SC-010 | 칩 `유조선` → 시드의 유조선 수와 같은 행 수 | FR-008 · SCR-002 | [E2E] 칩 필터 | 예 |

---

## 7. 오류·경계 처리

| 상황 | 발생 화면·요소 | 사용자 표시 문구 | 이후 동작 | 데이터·로그 |
|---|---|---|---|---|
| 인증 실패 | SCR-001-EL-05 | `이메일 또는 비밀번호가 올바르지 않습니다.` | 비밀번호 칸 비움 | 실패 횟수 서버 로그(이메일 해시) |
| 세션 만료 | SCR-001-EL-06 | `세션이 만료되었습니다. 다시 로그인하세요.` | 로그인 후 `/fleet` | 세션 삭제 |
| 권한 없음(화면) | SCR-009 | `이 화면에 접근할 권한이 없습니다.` | 선대 현황 복귀 | 서버 로그 |
| 권한 없음(API) | 해당 없음 — API | JSON `{ "error": "forbidden" }` 403 | — | 서버 로그 |
| 잘못된 상태 전이(예: 초안 승인) | 해당 없음 — API | 409 `{ "error": "invalid_transition" }` | — | 서버 로그 |
| 테스트 API 비활성 환경 호출 | 해당 없음 — API | 404 | — | — |

---

## 8. 브랜드·디자인

### 9.1 시각 시스템

- 디자인 기준: `docs/DESIGN.md` — `[확정]` 사용자 지정 “Apple DESIGN.md”. 출처는 VoltAgent/awesome-design-md의 Apple 분석 문서(MIT, `docs/DESIGN.NOTICE.md`). Apple 공식 문서가 아니다.
- 폰트: **Pretendard**. DESIGN.md의 SF Pro 지정은 따르지 않고 같은 크기·굵기·자간 계층을 Pretendard에 적용한다. 굵기 단계 300/400/600/700, 500 사용 금지(DESIGN.md 규칙 유지).
- 단일 강조색 Action Blue `#0066cc`(어두운 타일 위 `#2997ff`). 상태 의미 색은 아래 9.3 확장 토큰으로만 쓰고 버튼·링크에는 쓰지 않는다.
- 보조 텍스트 색(DESIGN.md 예외): `ink-muted-48`(#7a7a7a)은 흰 배경 대비 4.29:1로 WCAG AA(본문 4.5:1)와 NFR-03에 미달하므로 **비활성 텍스트에만** 쓴다. 읽어야 하는 보조 텍스트(caption, fine-print, KPI 라벨, footer)는 `ink-muted-80`(#333333)을 쓴다. DESIGN.md의 fine-print·footer 법적 문구 `ink-muted-48` 지정은 따르지 않는다.
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
| typography.fine-print | 12px/400/-0.12px | 고지 문구(SCR-001-EL-07, footer) |
| colors.ink-muted-80 | #333333 | 보조 텍스트(caption·fine-print·KPI 라벨·footer) |
| colors.ink-muted-48 | #7a7a7a | 비활성 텍스트 전용(9.1 예외) |
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
| Check 단계 테스트 | `/pdca analyze`에서 `npm run test:unit` · `npm run prd:check` · `npm run test:sc {feature}` · `npm run test:e2e`를 실제로 실행하고 결과를 analysis 문서에 기록. `test:sc`는 14장에서 그 feature까지 배치된 SC를 누적 실행한다 |
| 완료 조건 | 두 관문 모두 통과: ① match rate 95% 이상 ② 테스트 — `npm run test:unit`·`npm run prd:check` 통과, `npm run test:sc {feature}`(누적 SC) 전체 통과. 전체 `npm run test:e2e`는 매 Check에서 실행·기록하되, 이후 feature 화면이 필요한 SC가 남아 있으므로 **전체 통과는 마지막 feature(`inspection-plan`) Check의 관문**이다. 그 전 feature에서 전체 E2E 실패가 누적 SC 밖 SC로만 이루어졌는지 analysis 문서에 SC별로 적는다. gap-detector는 테스트를 실행하지 않으므로 match rate만으로 완료 판정하지 않는다 |

---

## 부록 A. 데이터 계약(이 feature)

### DATA-001 사용자·세션 (`users` + `sessions`, 시드 `users.json`)

| 필드 | 타입 | 필수 | 기본값 | 검증·제약 | 읽기 화면·요소 | 쓰기 화면·요소 | 출처 |
|---|---|---|---|---|---|---|---|
| userId | string | 예 | — | 고유 | NAV-04 | 시드 | [가설] |
| email | string | 예 | — | 이메일, 고유 | SCR-001-EL-02 | 시드 | [가설] |
| displayName | string | 예 | — | 1~30자 | NAV-04, SCR-008-EL-11 | 시드 | [가설] |
| role | enum(inspector, admin) | 예 | — | — | NAV-03·04, 권한 검사 | 시드 | [확정·4.1] |
| passwordEnv | string | 예 | — | 환경 변수 이름, 값 저장 금지 | 서버 | 시드 | [확정·11.1] |
| ~~passwordHash~~ | — v1.1 삭제, v1.3에서 password_hash로 대체 | | | | | | |
| password_hash | string | 예 | — | bcrypt 해시, 원문 저장 금지 | 서버 | `db:seed`·`/api/test/reset` | — |
| session.token_hash | string | 예 | — | 토큰 SHA-256, 고유 | 서버 | SCR-001-EL-04 | — |
| session.expiresAt | datetime | 예 | 로그인+8h | — | 서버 | SCR-001-EL-04, 테스트 API | [기본값] |

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
| humanNote | string \| null | 아니오 | null | 0~200자 | SCR-004-EL-03 `-note` | SCR-004-EL-21 | — |
| reviewedBy / reviewedAt | string / datetime | 아니오 | null | 결정 시 필수 | SCR-004-EL-03 | 서버 | — |
| version | int | 예(런타임) | 0 | 낙관적 잠금 | 서버 | 서버 | — |

### DATA-009 시뮬레이션 실행 (`simulation-runs.json`)

| 필드 | 타입 | 필수 | 기본값 | 검증·제약 | 읽기 | 쓰기 | 출처 |
|---|---|---|---|---|---|---|---|
| runId | string | 예 | — | I-5 형식 | SCR-006-EL-08 | SCR-006-EL-03 | — |
| vesselId | string | 예 | — | FK | — | SCR-006-EL-03 | — |
| horizonYears | int | 예 | 3 | 1, 3, 5 | SCR-006-EL-05·08, SCR-007-EL-01 | SCR-006-EL-01 | — |
| route | enum(calm, moderate, harsh) | 예 | moderate | — | 같음 | SCR-006-EL-02 | — |
| paramsSnapshot | object | 예 | — | DATA-008 전체 복사 | SCR-006-EL-05 | 서버 | — |
| results[] | {memberId, predictedThicknessMm, conditionIndex, fatigueUsage, pof, criticality, risk, grade, crackConfirmed} | 예 | — | 16행 | SCR-006-EL-06·07, SCR-007, SCR-002-EL-04·08 | 서버 | — |
| counts | {high, medium, low} | 예 | — | 합 16 | SCR-006-EL-05·08 | 서버 | — |
| createdBy / createdAt | string / datetime | 예 | — | — | SCR-006-EL-08, SCR-003-EL-05 | 서버 | — |

### DATA-010 검사 계획 (`inspection-plans.json`)

| 필드 | 타입 | 필수 | 기본값 | 검증·제약 | 읽기 | 쓰기 | 출처 |
|---|---|---|---|---|---|---|---|
| planId | string | 예 | — | 선박당 현재 계획 1개 | — | SCR-007-EL-04 | — |
| vesselId / runId | string | 예 | — | FK | SCR-007-EL-01 | SCR-007-EL-04 | — |
| budgetHours | int | 예 | DATA-008 기본 | 4~200 | SCR-007-EL-03·06 | SCR-007-EL-03 | — |
| items[] | {memberId, risk, grade, hours, reason(mandatory/efficiency)} | 예 | — | — | SCR-007-EL-07 | 서버 | — |
| excluded[] | {memberId, risk, grade, hours} | 예 | — | — | SCR-007-EL-08 | 서버 | — |
| totalHours / coveragePct / mandatoryCount | number | 예 | — | 11.4.4 | SCR-007-EL-06 | 서버 | — |
| portCallId | string \| null | 아니오 | null | — | SCR-007-EL-09·10 | 서버 | — |
| status | enum(draft, review_requested, approved, rejected) | 예 | draft | FR-031 전이만 | SCR-007-EL-18, SCR-002-EL-05·08, SCR-003-EL-06 | SCR-007-EL-12·13·16 | — |
| rejectReason | string \| null | 아니오 | null | 5~200자 | SCR-007-EL-17 | SCR-007-EL-15 | — |
| requestedBy / decidedBy / decidedAt | string / datetime | 아니오 | null | — | SCR-007 | 서버 | — |
