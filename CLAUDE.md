<!-- to-prd:begin — docs/PRD.md에서 생성됨. 직접 고치지 말고 PRD를 갱신한 뒤 to-prd를 다시 실행할 것 -->
## to-prd 실행 규칙

- 요구사항 정본은 `docs/PRD.md`(정본 개정 v1.6)다. feature 기준은 `docs/00-pm/{feature}.prd.md`다.
- UI는 `docs/DESIGN.md`를 따른다. 폰트는 Pretendard만 사용한다. 컴포넌트는 PRD 9장 컴포넌트 목록의 이름만 사용한다.
- PRD 3장 비목표(NG-*)에 있는 기능은 구현하지 않는다. 필요해 보이면 구현하지 말고 PRD 갱신을 먼저 요청한다.
- 모든 UI 요소에 PRD 요소 ID를 `data-testid` 값으로 붙인다. E2E 셀렉터는 `data-testid`만 사용한다.
- `/pdca analyze`(Check) 단계에서 다음 명령을 실제로 실행하고 결과를 analysis 문서에 기록한다: `npm run test:unit` · `npm run prd:check` · `npm run test:sc {feature}` · `npm run test:e2e`. 전체 E2E 결과는 SC별로 적는다.
- 완료는 두 관문이다(PRD 15장). ① match rate 95% 이상 ② `test:unit`·`prd:check` 통과와 `test:sc {feature}`(PRD 14장에서 그 feature까지 배치된 SC 누적) 전체 통과. 하나라도 실패하면 `/pdca report`로 넘어가지 않는다.
- 전체 `npm run test:e2e` 통과는 마지막 feature(`inspection-plan`)의 관문이다. 그 전 feature에서는 실패가 모두 이후 feature에 배치된 SC인지 확인해 기록하고, 누적 SC 안의 실패가 하나라도 있으면 미통과다.
- 보조 텍스트 색은 PRD 9.1 예외를 따른다: `ink-muted-48`은 비활성 텍스트 전용, 읽는 보조 텍스트는 `ink-muted-80`.
<!-- to-prd:end -->

## 프로젝트 메모

- 계산 공식의 기준 구현은 `tests/reference/model.mjs`(오라클)다. 앱 코드에서 import하지 말고 PRD 11.4를 따라 따로 구현한다.
- 합성 데이터는 `npm run seed:generate`로만 바꾼다. 바꾸면 `npm run test:unit`으로 시나리오가 유지되는지 확인한다.
- PRD를 고치면 `npm run prd:build`(정합성 검사 → feature 파생본 → PRD.html)를 실행한다.
- 실행 환경은 localhost(`http://localhost:3000`), DB는 SQLite(`better-sqlite3`, `DATABASE_PATH`, 기본 `data/app.db`)다. 클라우드 배포·관리형 DB는 비목표(NG-9)다.
- 환경 변수 이름·규칙은 PRD 11.3을 따른다. 값은 `.env.local`에만 두고 커밋하지 않는다(`.env.example`은 이름만).
- E2E는 `data/e2e.db`를 쓰므로 개발 DB를 초기화하지 않는다. 시연 서버에는 `APP_TEST_MODE`를 넣지 않는다.
- E2E 실행에는 `SEED_INSPECTOR_PASSWORD`·`SEED_ADMIN_PASSWORD`와 `npm run start:e2e` 스크립트(프로덕션 빌드 + `APP_TEST_MODE=1` + `DATABASE_PATH=data/e2e.db`)가 필요하다.
- 셸(실행 환경)에 `SEED_*`가 이미 있으면 `.env.local`보다 우선한다. 서버를 따로 띄워 `E2E_BASE_URL`로 테스트할 때는 서버와 Playwright가 같은 값을 쓰게 한다(다르면 로그인 E2E가 모두 실패한다).
