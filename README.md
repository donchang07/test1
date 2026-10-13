# KR Smart RBI

선체 구조 건전성 기반 지능형 위험도 기반 검사(Smart RBI) MVP의 **bkit 착수 패키지**입니다.
검사 판독(자동화) → 열화 예측(예측) → 시나리오 시뮬레이션(시뮬레이션) → 검사 계획(최적화)을 하나의 흐름으로 구현합니다.
PRD의 9개 화면(SCR-001~009)과 공통 404 페이지가 모두 구현되어 있습니다. 스택은 Next.js + **SQLite**이며 **localhost**에서 실행합니다. 모든 데이터는 합성 데이터입니다.

## 구성

| 경로 | 내용 |
|---|---|
| `docs/PRD.md` | 요구사항 정본(화면·메뉴·권한·데이터·FR·SC·계산 공식). 읽기용 `docs/PRD.html` |
| `docs/00-pm/*.prd.md` | bkit이 읽는 feature 파생본 5개와 게이트·결정 목록 |
| `docs/DESIGN.md` | Apple 스타일 디자인 시스템(출처 `docs/DESIGN.NOTICE.md`), 폰트는 Pretendard |
| `scripts/generate-synthetic-data.mjs` | 결정적 합성 데이터 생성기(seed 20261001) → `data/seed/`, `public/synthetic/inspection/` |
| `tests/reference/model.mjs` | PRD 11.4 계산 공식의 기준 구현(테스트 오라클) |
| `tests/unit/` | 합성 데이터·기준 모델 단위 테스트 |
| `tests/e2e/` | Playwright E2E — PRD 완료 판정 기준 SC-001~034, feature별 파일 |
| `scripts/check-prd.mjs` | PRD ID 연결·E2E testid 대조 검사 |

## 명령

```bash
npm install
npm run test:unit        # 합성 데이터·기준 모델 (지금 실행 가능)
npm run prd:check        # PRD 정합성 + E2E testid 대조
npm run test:e2e:list    # E2E 목록
npm run test:e2e         # 앱 구현 후: SEED_* 환경 변수와 npm run start:e2e 필요
```

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # SEED_INSPECTOR_PASSWORD, SEED_ADMIN_PASSWORD 값을 채운다
npm run db:seed              # data/app.db 생성 + 합성 데이터·시드 계정 (처음 한 번, 생략해도 첫 실행 때 자동 생성)
npm run dev                  # http://localhost:3000
```

시드 계정: `inspector1@synthetic.example`(검사원), `admin1@synthetic.example`(관리자). 비밀번호는 `.env.local`에 넣은 값입니다.
DB는 SQLite `data/app.db`, E2E(`npm run test:e2e`)는 `data/e2e.db`를 따로 씁니다. 환경 변수 규칙은 `docs/PRD.md` 11.3.

### 구현 범위

| 화면 | 내용 |
|---|---|
| SCR-001·009, 404 | 로그인·로그아웃·세션 만료·권한, 접근 거부(403), 없는 경로(404) |
| SCR-002·003 | 선대 현황(KPI·검색·선종 필터·관리자 초기화), 선박 개요(4단계 카드·다음 단계) |
| SCR-004 ① 판독 | AI 판독 확정·수정·기각·검토 취소, 보고서 초안 |
| SCR-005 ② 예측 | 부재별 부식 속도·교체 도달 연도(PRD 11.4.2), 두께 추이 차트 |
| SCR-006 ③ 시뮬레이션 | 기간·해상 조건별 위험점수(11.4.3), 구역 맵, 실행 이력 |
| SCR-007 ④ 계획 | 예산 내 최적화(11.4.4), 기항지 추천, 검토 요청·승인·반려 |
| SCR-008 모델 설정 | 계산 파라미터 변경·검증·기본값 복원, 변경 이력 |

`npm run test:e2e` 34건(SC-001~034)이 모두 통과합니다.

## bkit 진행 순서

`/pdca plan auth-fleet` → design → do → analyze(테스트 실행) → report, 이어서
`inspection-review` → `degradation-forecast` → `risk-simulation` → `inspection-plan`.
