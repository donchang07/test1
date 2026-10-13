# 착수 게이트 — inspection-plan

| 항목 | 값 |
|---|---|
| 대상 | `docs/00-pm/inspection-plan.prd.md` (정본 v1.7 파생) |
| 판정 | **조건부 착수** — Blocker 0. 정본 Major M-1(bkit 계약 대조), M-2(E2E 첫 실행)를 승계 |
| 확인 | 화면·FR·SC·DATA 연결은 정본 `npm run prd:check`로 검증. 비목표 표 전체 포함 |
| 착수 명령 | `/pdca plan inspection-plan` |
| 완료 조건 | match rate 95% 이상 **그리고** `npm run test:unit` · `npm run prd:check` · `npm run test:sc inspection-plan`(PRD 14장 누적 SC) · 전체 `npm run test:e2e` 통과(마지막 feature 관문) — PRD 15장 |
