# KR Smart RBI

선체 구조 건전성 기반 지능형 위험도 기반 검사(Smart RBI) MVP의 **bkit 착수 패키지**입니다.
검사 판독(자동화) → 열화 예측(예측) → 시나리오 시뮬레이션(시뮬레이션) → 검사 계획(최적화)을 하나의 흐름으로 구현합니다.
앱 코드는 아직 없으며 bkit(`/pdca`)으로 구현합니다. 스택은 Next.js + **SQLite**이며 **localhost**에서 실행합니다. 모든 데이터는 합성 데이터입니다.

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

### 뼈대 구현 범위

| 구현됨 | 자리표시(다음 feature에서 구현) |
|---|---|
| 로그인·로그아웃·세션 만료·권한(SCR-001, SCR-009), 선대 현황(SCR-002), 선박 개요(SCR-003), 전역·선박 내비게이션, SQLite 스키마·시드, 테스트 API | ① 판독, ② 예측, ③ 시뮬레이션, ④ 계획, 모델 설정 화면 |

## bkit 진행 순서

`/pdca plan auth-fleet` → design → do → analyze(테스트 실행) → report, 이어서
`inspection-review` → `degradation-forecast` → `risk-simulation` → `inspection-plan`.
