# 착수 게이트 — risk-simulation

| 항목 | 값 |
|---|---|
| 대상 | `docs/00-pm/risk-simulation.prd.md` (정본 v1.3 파생) |
| 판정 | **조건부 착수** — Blocker 0. 정본 Major M-1(bkit 계약 대조), M-2(E2E 첫 실행)를 승계 |
| 확인 | 화면·FR·SC·DATA 연결은 정본 `npm run prd:check`로 검증. 비목표 표 전체 포함 |
| 착수 명령 | `/pdca plan risk-simulation` |
| 완료 조건 | match rate 90% 이상 **그리고** `npm run test:unit` · `npx playwright test tests/e2e/risk-simulation.spec.ts` 통과(마지막 feature 후 전체 `npm run test:e2e`) |
