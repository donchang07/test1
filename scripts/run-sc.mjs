#!/usr/bin/env node
// bkit Check 단계의 Runtime 검증 실행기.
// PRD 14장 feature 표에서 지정 feature까지 배치된 SC를 모아(누적 회귀) Playwright로 실행하고
// test-results/sc-{feature}.json 에 SC별 결과를 남긴다. Match Rate 계산은 gap-detector가 한다.
// 사용법: node scripts/run-sc.mjs <feature>

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const feature = process.argv[2];
const prd = readFileSync('docs/PRD.md', 'utf8');
const rows = prd.split('\n').filter((l) => /^\| \d+ \| `/.test(l)).map((l) => l.split(/(?<!\\)\|/).map((c) => c.trim()));
const order = rows.map((c) => c[2].replace(/`/g, ''));
if (!order.includes(feature)) { console.error(`feature 없음: ${feature} (${order.join(', ')})`); process.exit(2); }
const expand = (text) => [...text.matchAll(/SC-(\d{3})(?:~(\d{3}))?/g)].flatMap((m) => {
  const a = Number(m[1]); const b = Number(m[2] ?? m[1]);
  return Array.from({ length: b - a + 1 }, (_, i) => `SC-${String(a + i).padStart(3, '0')}`);
});
const own = expand(rows[order.indexOf(feature)][5]);
const cumulative = rows.slice(0, order.indexOf(feature) + 1).flatMap((c) => expand(c[5]));

mkdirSync('test-results', { recursive: true });
const out = `test-results/pw-${feature}.json`;
// Playwright grep은 '프로젝트 파일 제목' 전체 문자열에 매칭하므로 줄 시작(^) 대신 공백 경계를 쓴다.
const grep = `(^| )(${cumulative.join('|')}) `;
try {
  execSync(`npx playwright test --grep "${grep}" --reporter=json`, {
    stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: out },
  });
} catch { /* 실패 여부는 결과 파일로 판정 */ }

const results = {};
if (existsSync(out)) {
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) {
      const id = spec.title.match(/^(SC-\d{3})/)?.[1];
      if (!id) continue;
      for (const t of spec.tests) {
        const r = t.results.at(-1);
        const ok = r?.status === 'passed';
        results[id] = { ok: (results[id]?.ok ?? true) && ok, project: t.projectName,
          error: ok ? undefined : (r?.error?.message ?? r?.status ?? 'not run').split('\n').slice(0, 3).join(' ') };
      }
    }
    (suite.suites ?? []).forEach(visit);
  };
  JSON.parse(readFileSync(out, 'utf8')).suites.forEach(visit);
}
const summary = {
  feature, ranAt: new Date().toISOString(), own, cumulative,
  results: Object.fromEntries(cumulative.map((id) => [id, results[id] ?? { ok: false, error: 'not run' }])),
};
summary.passed = cumulative.filter((id) => summary.results[id].ok).length;
summary.total = cumulative.length;
writeFileSync(`test-results/sc-${feature}.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`[Runtime] ${feature}: ${summary.passed}/${summary.total} SC 통과 (누적)`);
for (const id of cumulative) if (!summary.results[id].ok) console.log(`  ✗ ${id}: ${summary.results[id].error}`);
process.exit(summary.passed === summary.total ? 0 : 1);
