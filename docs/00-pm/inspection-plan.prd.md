# inspection-plan — KR Smart RBI feature PRD

| 항목 | 값 |
|---|---|
| 정본 | `docs/PRD.md` v1.3 |
| 성격 | 파생본 — 직접 편집 금지. 정본 수정 후 `node scripts/derive-feature-prds.mjs`로 재생성 |
| 순서·의존 | 5 · risk-simulation |
| 규모 | M |
| 첫 명령 | `/pdca plan inspection-plan` |

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
| 5 | `inspection-plan` | SCR-007, SCR-008 | FR-028~035 | SC-026~032 | DATA-007, 008, 009, 010, 011 | risk-simulation | M |

### 4.1 화면 인벤토리

| ID | 화면 | 화면 유형 | Route | 접근 | 기능 단계 |
|---|---|---|---|---|---|
| SCR-007 | ④ 검사 계획 | 작업·승인 | `/vessels/[vesselId]/plan` | 검사원·관리자 | 최적화 |
| SCR-008 | 모델 설정 | 관리 | `/admin/settings` | 관리자 | — |

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

#### SCR-007 ④ 검사 계획

| 항목 | 내용 |
|---|---|
| 화면 유형 | 작업·승인 |
| Route | `/vessels/[vesselId]/plan` |
| 대상·권한 | 검사원(최적화·검토 요청), 관리자(+ 승인·반려) |
| 목적 | 최신 시뮬레이션 결과로 예산 내 검사 계획을 만들고 승인 흐름을 진행(11.4.4) |
| 진입 | NAV-15, SCR-006 EL-11, SCR-003 |
| 종료·전이 | 승인 후 SCR-002 복귀(NAV-02) |
| 관련 | US-04, US-05, US-07 · FR-028~031, FR-034, FR-035 · SC-026~030 · DATA-007, 009, 010 |
| 디자인 참고 | REF-06 하단 `floating-sticky-bar`(상태 + 주요 버튼), 본문은 요약 카드 → 표 |

계획 상태 라벨: `draft` → `초안`, `review_requested` → `검토 요청`, `approved` → `승인됨`, `rejected` → `반려됨`.

| 요소 ID | 종류 | 컴포넌트 | 라벨·표시값 | 노출 | 조건 | 데이터 | 입력·검증 | 행동·결과 |
|---|---|---|---|---|---|---|---|---|
| SCR-007-EL-01 | 정보 | 텍스트(caption) | `기준 시뮬레이션: {일시} · {n}년 · {해상 조건}` | 전체 | 시뮬레이션 있음 | DATA-009 | — | — |
| SCR-007-EL-02 | 빈 상태 | `inline-alert`(info) + `text-link` | `먼저 시뮬레이션을 실행하세요.` 링크 `시뮬레이션으로`(testid `SCR-007-EL-02-link`) | 전체 | 시뮬레이션 0건 | 정적 | — | → SCR-006 |
| SCR-007-EL-03 | 입력 | `text-input`(number) | 라벨 `검사 시간 예산(시간)`, 기본값 = 모델 설정 기본 예산 | 전체 | 시뮬레이션 있음, 계획이 `승인됨`이 아님 | DATA-010.budgetHours | 정수 4~200, 입력 즉시 검증. 위반 시 `4~200 사이의 정수를 입력하세요.`(testid `SCR-007-EL-03-error`) | — |
| SCR-007-EL-04 | 버튼 | `button-primary` | `최적화 실행` | 전체 | 시뮬레이션 있음. 계획 `승인됨`이면 비활성 + 안내 `승인된 계획은 변경할 수 없습니다.`(testid `SCR-007-EL-04-locked`) | — | EL-03 유효해야 활성 | FR-028 |
| SCR-007-EL-05 | 알림 | `inline-alert`(error) | `필수(높음) 항목에만 {h}시간이 필요해 예산 {b}시간을 초과합니다. 예산을 {h}시간 이상으로 늘리세요.` | 전체 | infeasible | 계산값 | — | 계획 저장 안 함 |
| SCR-007-EL-06 | 요약 | `store-utility-card` | `선택 {n}개 · 총 {h}시간 / 예산 {b}시간 · 위험 커버리지 {p}% · 필수 {m}개` (하위 testid `-count` `-hours` `-coverage` `-mandatory`) | 전체 | 계획 있음 | DATA-010 | — | — |
| SCR-007-EL-07 | 표 | `data-table` | `검사 항목` 행 testid `SCR-007-EL-07-{memberId}`, 위험점수 내림차순. 열: `부재`(name) `위험점수`(risk) `등급`(grade) `소요`(hours) `선정 사유`(reason: `필수(고위험)`/`위험 대비 효율`) | 전체 | 계획 있음 | DATA-010.items | — | — |
| SCR-007-EL-08 | 표 | `data-table`(접힘) | `제외 항목 {n}개` 펼치기, 행 testid `SCR-007-EL-08-{memberId}` | 전체 | 계획 있음 | DATA-010 | — | 펼치기/접기 |
| SCR-007-EL-09 | 카드 | `store-utility-card` | `추천 기항지: {port}` / `입항 {eta} · 체류 {dwell}시간` | 전체 | 계획 있음 + 기항지 있음 | DATA-007 | — | — |
| SCR-007-EL-10 | 알림 | `inline-alert`(warning) | `조건에 맞는 기항지가 없습니다. 체류 시간이 {h}시간 이상이고 검사원 배치가 가능한 기항지가 필요합니다.` | 전체 | 계획 있음 + 기항지 없음 | 계산값 | — | 계획은 저장 가능 |
| SCR-007-EL-11 | 바 | `floating-sticky-bar` | 좌: EL-18, 우: 역할·상태별 버튼 | 전체 | 계획 있음 | — | — | — |
| SCR-007-EL-12 | 버튼 | `button-primary` | `검토 요청` | 검사원·관리자 | 상태 `초안` 또는 `반려됨` | — | — | FR-031 |
| SCR-007-EL-13 | 버튼 | `button-primary` | `승인` | 관리자만 | 상태 `검토 요청` | — | — | FR-031 |
| SCR-007-EL-14 | 버튼 | `button-secondary-pill` | `반려` | 관리자만 | 상태 `검토 요청` | — | — | EL-15 열기 |
| SCR-007-EL-15 | 모달 | `modal-sheet` | 제목 `반려 사유`, textarea(testid `SCR-007-EL-15-reason`) | 관리자만 | EL-14 클릭 | DATA-010.rejectReason | 필수, 5~200자. 위반 시 `반려 사유를 5자 이상 입력하세요.`(testid `SCR-007-EL-15-error`) | — |
| SCR-007-EL-16 | 버튼 | `button-primary` | `반려 확정` | 관리자만 | EL-15 열림 | — | — | FR-031 |
| SCR-007-EL-17 | 알림 | `inline-alert`(warning) | `반려 사유: {사유}` | 전체 | 상태 `반려됨` | DATA-010.rejectReason | — | — |
| SCR-007-EL-18 | 배지 | `status-badge` | `초안`/`검토 요청`/`승인됨`/`반려됨` | 전체 | 계획 있음 | DATA-010.status | — | — |
| SCR-007-EL-19 | 알림 | `inline-alert`(error) | `저장하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.` | 전체 | 저장·상태 변경 실패 | 정적 | — | 화면 상태 유지 |

| 상태 | 정의 | 검증 SC |
|---|---|---|
| 초기 | 시뮬레이션 없음 → EL-02 / 있음 → EL-01·03·04, 기존 계획 표시 | SC-026 |
| 로딩 | EL-04·12·13·16 요청 중 비활성 | SC-026 |
| 빈 | EL-02 | SC-026 |
| 성공 | EL-06~09/10, EL-18 `초안` | SC-026, SC-028 |
| 검증 오류 | EL-03-error, EL-15-error, infeasible EL-05 | SC-027, SC-029, SC-030 |
| 시스템 오류 | EL-19 | SC-029 |
| 권한 없음 | 검사원에게 EL-13·14 미노출, 승인 API 403 | SC-030 |
| 오프라인 | EL-19 | SC-029 |

---

#### SCR-008 모델 설정

| 항목 | 내용 |
|---|---|
| 화면 유형 | 관리 |
| Route | `/admin/settings` |
| 대상·권한 | 관리자만. 검사원 → SCR-009 |
| 목적 | 11.4 계산 파라미터를 조회·변경·복원하고 변경 이력을 본다 |
| 진입 | NAV-03 |
| 종료·전이 | 저장 후 같은 화면 |
| 관련 | US-06 · FR-019, FR-032, FR-033 · SC-002, SC-006, SC-031, SC-032 · DATA-008, 011 |
| 디자인 참고 | REF-04 단일 열 폼(`store-utility-card` 1개), 하단 이력 표 |

| 요소 ID | 종류 | 컴포넌트 | 라벨·표시값 | 노출 | 조건 | 데이터 | 입력·검증 | 행동·결과 |
|---|---|---|---|---|---|---|---|---|
| SCR-008-EL-01 | 입력 | `text-input`(number) | `허용 쇠모율(%)` | 관리자 | 항상 | DATA-008.allowableDiminutionPct | 5~40, 소수 1자리 | — |
| SCR-008-EL-02 | 입력 | `text-input`(number) | `판독 보정계수(심각도당)` | 관리자 | 항상 | DATA-008.findingFactorPerSeverity | 0~1, 소수 2자리 | — |
| SCR-008-EL-03 | 입력 | `text-input`(number) | `기본 부식 속도(mm/년)` | 관리자 | 항상 | DATA-008.defaultCorrosionRateMmPerYear | 0.01~1, 소수 3자리 | — |
| SCR-008-EL-04 | 입력 | `text-input`(number) | `높음 기준(점)` | 관리자 | 항상 | DATA-008.riskThresholds.high | 정수 1~100 | — |
| SCR-008-EL-05 | 입력 | `text-input`(number) | `중간 기준(점)` | 관리자 | 항상 | DATA-008.riskThresholds.medium | 정수 0~99, 높음 기준 미만 | — |
| SCR-008-EL-06 | 입력 | `text-input`(number) | `기본 검사 시간 예산(시간)` | 관리자 | 항상 | DATA-008.defaultBudgetHours | 정수 4~200 | — |
| SCR-008-EL-07 | 버튼 | `button-primary` | `저장` | 관리자 | 변경 있음이면 활성 | — | 전 항목 유효 | FR-032 |
| SCR-008-EL-08 | 버튼 | `button-secondary-pill` | `기본값 복원` | 관리자 | 항상 | 11.4.1 기본값 | — | 입력값만 기본값으로 채움(저장은 EL-07) |
| SCR-008-EL-09 | 알림 | `inline-alert`(error) | 항목별 첫 오류 문구. 범위: `{항목}은 {min}~{max} 사이여야 합니다.` / 관계: `중간 기준은 높음 기준보다 작아야 합니다.` | 관리자 | 검증 실패 | 정적 | — | 저장 안 함 |
| SCR-008-EL-10 | 토스트 | `toast` | `설정을 저장했습니다. 이후 예측과 시뮬레이션에 적용됩니다.` | 관리자 | 저장 성공 | 정적 | — | — |
| SCR-008-EL-11 | 표 | `data-table` | `변경 이력` 최신 10건 행 testid `SCR-008-EL-11-{auditId}` : `{일시} · {사용자} · {항목}: {이전} → {이후}` | 관리자 | 이력 1건 이상, 없으면 `변경 이력이 없습니다.` | DATA-011 | — | — |
| SCR-008-EL-12 | 알림 | `inline-alert`(error) | `저장하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.` | 관리자 | 저장 요청 실패 | 정적 | — | 입력값 유지 |

| 상태 | 정의 | 검증 SC |
|---|---|---|
| 초기 | 현재 값, EL-07 비활성 | SC-002 |
| 로딩 | EL-07 비활성 `저장 중…` | SC-031 |
| 빈 | EL-11 `변경 이력이 없습니다.` | SC-031 |
| 성공 | EL-10, EL-11 행 추가 | SC-031 |
| 검증 오류 | EL-09 | SC-032 |
| 시스템 오류 | EL-12 | SC-032 |
| 권한 없음 | 검사원 → SCR-009, API 403 | SC-006 |
| 오프라인 | EL-12 | SC-032 |

---

## 5. 기능 요구사항

우선순위: `P0 (High)` 필수, `P1 (Medium)` MVP 포함 권장, `P2 (Low)` 여유 시.

| ID | 판정 가능한 요구사항 | 우선순위 | 시나리오 | 화면·요소 | 데이터 | 관련 SC | 검증 방법 |
|---|---|---|---|---|---|---|---|
| FR-028 | 최신 시뮬레이션과 예산으로 11.4.4 최적화를 실행해 계획을 `초안`으로 저장한다(기존 미승인 계획은 대체) | P0 (High) | US-04 | SCR-007-EL-01, 03, 04, 06~08 | DATA-009, 010 | SC-026 | [E2E] 선택 항목·총 시간·커버리지 = 기준 모델 |
| FR-029 | 필수 시간이 예산을 넘으면 계획을 저장하지 않고 EL-05에 필요 시간을 표시한다 | P0 (High) | US-07 | SCR-007-EL-05 | DATA-010 | SC-027 | [E2E] KR-SYN-005 황천 5년 예산 10 |
| FR-030 | 기준일 이후 기항 중 검사원 배치 가능·체류 ≥ 총 시간인 가장 이른 기항지를 추천하고 없으면 EL-10이다 | P0 (High) | US-04 | SCR-007-EL-09, 10 | DATA-007 | SC-026, SC-028 | [E2E] 추천 기항지 = 기준 모델, KR-SYN-009 없음 |
| FR-031 | 계획 상태: 초안/반려됨 →(검토 요청) 검토 요청 →(관리자 승인) 승인됨 \| (관리자 반려+사유) 반려됨. 승인됨은 재최적화 불가 | P0 (High) | US-04, US-05 | SCR-007-EL-11~18 | DATA-010 | SC-030 | [E2E] 검사원 요청 → 관리자 반려·재요청·승인 → 잠금 |
| FR-032 | 관리자는 모델 파라미터를 범위·관계 검증 후 저장하고 기본값을 복원할 수 있다 | P0 (High) | US-06 | SCR-008-EL-01~10, 12 | DATA-008 | SC-031, SC-032 | [E2E] 저장 성공·검증 오류 |
| FR-033 | 파라미터 변경은 이후 예측·시뮬레이션에만 적용되고 저장된 시뮬레이션 결과는 바뀌지 않는다 | P0 (High) | US-06 | SCR-005-EL-03, SCR-006-EL-08 | DATA-008, 009 | SC-031 | [E2E] 25%로 변경 → 교체 기준 재계산, 이전 실행 결과 유지 |
| FR-034 | 예산 입력은 정수 4~200만 허용한다 | P0 (High) | US-04 | SCR-007-EL-03 | DATA-010.budgetHours | SC-029 | [E2E] 3·201 입력 → 오류, 버튼 비활성 |
| FR-035 | 저장 요청이 네트워크 오류로 실패하면 해당 화면 오류 알림을 표시하고 화면 데이터를 바꾸지 않는다 | P0 (High) | — | SCR-004-EL-18, SCR-006-EL-10, SCR-007-EL-19, SCR-008-EL-12 | — | SC-018, SC-025, SC-029, SC-032 | [E2E] 오프라인 전환 후 저장 |

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
| SC-026 | 시뮬레이션 없으면 EL-02. KR-SYN-002 3년·보통 → 예산 40 최적화 → 선택 행 집합·총 시간·커버리지·필수 수·기항지 = 기준 모델, 상태 `초안` | FR-028, FR-030 · SCR-007 | [E2E] 기준 모델 비교 | 예 |
| SC-027 | KR-SYN-005 5년·황천 → 예산 10 최적화 → EL-05에 필요 시간 = 기준 모델, EL-06 없음 | FR-029 · SCR-007 | [E2E] 예산 초과 | 예 |
| SC-028 | KR-SYN-009 3년·보통 → 최적화 → EL-10 표시, EL-09 없음 | FR-030 · SCR-007 | [E2E] 기항지 없음 | 예 |
| SC-029 | 예산 3·201 → EL-03-error, EL-04 비활성. 최적화 요청 중 오프라인 → EL-19 | FR-034, FR-035 · SCR-007 | [E2E] 입력 검증·오류 | 예 |
| SC-030 | 검사원 `검토 요청` → 검사원에게 EL-13·14 없음 → 관리자 `반려`(사유 4자 → EL-15-error, 정상 사유 → `반려됨`) → 검사원에 EL-17 → 재요청 → 관리자 `승인` → `승인됨`, EL-04 비활성 + `-locked`, SCR-002 EL-05 수 변화 | FR-006, FR-031 · SCR-007, 002 | [E2E] 두 역할 컨텍스트 | 예 |
| SC-031 | 관리자: KR-SYN-001 시뮬레이션 실행 → 허용 쇠모율 25 저장 → EL-10·EL-11 행 → SCR-005 `renewal` = 기준 모델(25%) → SCR-006 이전 실행 결과 값 불변 | FR-019, FR-032, FR-033 · SCR-008, 005, 006 | [E2E] 설정 → 예측·이력 | 예 |
| SC-032 | 중간 기준 70·높음 70 → EL-09 관계 오류, 저장 안 됨. 허용 쇠모율 50 → 범위 오류. 오프라인에서 저장 → EL-12 | FR-032, FR-035 · SCR-008 | [E2E] 검증 | 예 |

---

## 7. 오류·경계 처리

| 상황 | 발생 화면·요소 | 사용자 표시 문구 | 이후 동작 | 데이터·로그 |
|---|---|---|---|---|
| 권한 없음(API) | 해당 없음 — API | JSON `{ "error": "forbidden" }` 403 | — | 서버 로그 |
| 시뮬레이션 없음 | SCR-007-EL-02 | `먼저 시뮬레이션을 실행하세요.` | 링크 이동 | — |
| 예산 초과 | SCR-007-EL-05 | 5.5 문구 | 계획 미저장 | — |
| 기항지 없음 | SCR-007-EL-10 | 5.5 문구 | 계획 저장 가능 | — |
| 승인된 계획 변경 | SCR-007-EL-04-locked | `승인된 계획은 변경할 수 없습니다.` | 최적화 비활성 | API 409 |
| 잘못된 상태 전이(예: 초안 승인) | 해당 없음 — API | 409 `{ "error": "invalid_transition" }` | — | 서버 로그 |
| 설정 검증 실패 | SCR-008-EL-09 | 5.5 문구 | 저장 안 함 | — |
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
| bkit 버전 | `[검증 기준]` 설치본·`bkit.config.json` 미확인. 설치 후 로컬 계약을 우선하고 차이를 부록 B에 기록 |
| 설정 | `bkit.config.json`의 `matchRateThreshold` 90 `[검증 기준]` |
| PM 단계 | `/pdca pm` 생략 — 이 PRD가 PM/PRD 역할을 대체 |
| 명령 순서(feature마다) | `/pdca plan {feature}` → `/pdca design {feature}` → `/pdca do {feature}` → `/pdca analyze {feature}` → (미달 시 `/pdca iterate {feature}`) → `/pdca report {feature}` |
| 첫 명령 | `/pdca plan auth-fleet` |
| Check 단계 테스트 | `/pdca analyze`에서 `npm run test:unit` · `npm run test:e2e` · `npm run prd:check`를 실제로 실행하고 결과를 analysis 문서에 기록 |
| 완료 조건 | 두 관문 모두 통과: ① match rate 90% 이상 ② 11.1 테스트 명령 전체 통과(해당 feature 범위의 E2E 포함). gap-detector는 테스트를 실행하지 않으므로 match rate만으로 완료 판정하지 않는다 |

---

## 부록 A. 데이터 계약(이 feature)

### DATA-007 기항 일정 (`port-calls.json`)

| 필드 | 타입 | 필수 | 기본값 | 검증·제약 | 읽기 | 쓰기 | 출처 |
|---|---|---|---|---|---|---|---|
| portCallId | string | 예 | — | 고유 | — | 시드 | [가설] |
| vesselId | string | 예 | — | FK | — | 시드 | [가설] |
| port | string | 예 | — | — | SCR-007-EL-09 | 시드 | [가설] |
| eta | date | 예 | — | — | SCR-007-EL-09 | 시드 | [가설] |
| dwellHours | int | 예 | — | > 0 | SCR-007-EL-09·10 | 시드 | [가설] |
| inspectorAvailable | boolean | 예 | — | — | 11.4.4 | 시드 | [가설] |

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

### DATA-011 감사 로그 (`audit-log.json`)

| 필드 | 타입 | 필수 | 기본값 | 검증·제약 | 읽기 | 쓰기 | 출처 |
|---|---|---|---|---|---|---|---|
| auditId | string | 예 | — | 고유 | SCR-008-EL-11 | 서버 | — |
| actor | string | 예 | — | userId | SCR-008-EL-11 | 서버 | — |
| action | enum(finding.decide, finding.revert, plan.request, plan.approve, plan.reject, params.update, data.reset) | 예 | — | — | SCR-008-EL-11(params.update만) | 서버 | — |
| target | string | 예 | — | ID | 같음 | 서버 | — |
| before / after | object | 예 | — | 변경 필드만 | 같음 | 서버 | — |
| at | datetime | 예 | — | — | 같음 | 서버 | — |
