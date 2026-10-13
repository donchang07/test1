<!-- to-prd:begin — docs/PRD.md에서 생성됨. 직접 고치지 말고 PRD를 갱신한 뒤 to-prd를 다시 실행할 것 -->
## to-prd 실행 규칙

- 요구사항 정본은 `docs/PRD.md`(정본 개정 v1.3)다. feature 기준은 `docs/00-pm/{feature}.prd.md`다.
- UI는 `docs/DESIGN.md`를 따른다. 폰트는 Pretendard만 사용한다. 컴포넌트는 PRD 9장 컴포넌트 목록의 이름만 사용한다.
- PRD 3장 비목표(NG-*)에 있는 기능은 구현하지 않는다. 필요해 보이면 구현하지 말고 PRD 갱신을 먼저 요청한다.
- 모든 UI 요소에 PRD 요소 ID를 `data-testid` 값으로 붙인다. E2E 셀렉터는 `data-testid`만 사용한다.
- `/pdca analyze`(Check) 단계에서 다음 명령을 실제로 실행하고 결과를 analysis 문서에 기록한다: `npm run test:unit` · `npm run test:e2e`
- 완료는 두 관문이다. match rate 90% 이상, 그리고 위 테스트 전체 통과. 하나라도 실패하면 `/pdca report`로 넘어가지 않는다.
<!-- to-prd:end -->

## 프로젝트 메모

- 계산 공식의 기준 구현은 `tests/reference/model.mjs`(오라클)다. 앱 코드에서 import하지 말고 PRD 11.4를 따라 따로 구현한다.
- 합성 데이터는 `npm run seed:generate`로만 바꾼다. 바꾸면 `npm run test:unit`으로 시나리오가 유지되는지 확인한다.
- PRD를 고치면 `npm run prd:build`(정합성 검사 → feature 파생본 → PRD.html)를 실행한다.
- 실행 환경은 localhost(`http://localhost:3000`), DB는 SQLite(`better-sqlite3`, `DATABASE_PATH`, 기본 `data/app.db`)다. 클라우드 배포·관리형 DB는 비목표(NG-9)다.
- 환경 변수 이름·규칙은 PRD 11.3을 따른다. 값은 `.env.local`에만 두고 커밋하지 않는다(`.env.example`은 이름만).
- E2E는 `data/e2e.db`를 쓰므로 개발 DB를 초기화하지 않는다. 시연 서버에는 `APP_TEST_MODE`를 넣지 않는다.
- E2E 실행에는 `SEED_INSPECTOR_PASSWORD`·`SEED_ADMIN_PASSWORD`와 `npm run start:e2e` 스크립트(프로덕션 빌드 + `APP_TEST_MODE=1` + `DATABASE_PATH=data/e2e.db`)가 필요하다.
