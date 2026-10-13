#!/usr/bin/env node
// docs/PRD.md 정본의 ID 연결과 E2E 테스트의 testid를 기계적으로 검사한다.
// 1) 정의되지 않은 ID 참조  2) FR↔SC 양방향 연결  3) [E2E] SC마다 E2E 테스트 존재
// 4) E2E가 쓰는 testid가 PRD에 정의됨  5) 계약 섹션의 미정 표현(TBD 등)
// 사용법: node scripts/check-prd.mjs [docs/PRD.md]

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const prdPath = process.argv[2] ?? 'docs/PRD.md';
const prd = readFileSync(prdPath, 'utf8');
const errors = [];
const warn = [];

const rows = prd.split('\n').filter((l) => l.startsWith('| '));
// 셀 안의 \| 는 구분자가 아니다.
const cellsOf = (line) => line.split(/(?<!\\)\|/).map((c) => c.trim());
const firstCell = (line) => cellsOf(line)[1];

const defined = {
  SCR: new Set(), EL: new Set(), NAV: new Set(), FR: new Set(), SC: new Set(),
  NG: new Set(), REF: new Set(), DATA: new Set(), NFR: new Set(),
};
for (const line of rows) {
  const id = firstCell(line);
  if (/^SCR-\d{3}$/.test(id)) defined.SCR.add(id);
  else if (/^SCR-\d{3}-EL-\d{2}$/.test(id)) defined.EL.add(id);
  else if (/^NAV-\d{2}$/.test(id)) defined.NAV.add(id);
  else if (/^FR-\d{3}$/.test(id)) defined.FR.add(id);
  else if (/^SC-\d{3}$/.test(id)) defined.SC.add(id);
  else if (/^NG-\d+$/.test(id)) defined.NG.add(id);
  else if (/^REF-\d{2}$/.test(id)) defined.REF.add(id);
  else if (/^NFR-\d{2}$/.test(id)) defined.NFR.add(id);
}
for (const m of prd.matchAll(/^### (DATA-\d{3})/gm)) defined.DATA.add(m[1]);

// 정의 행 중복
const seen = new Map();
for (const line of rows) {
  const id = firstCell(line);
  if (!/^(SCR-\d{3}(-EL-\d{2})?|NAV-\d{2}|FR-\d{3}|SC-\d{3}|NG-\d+|REF-\d{2}|NFR-\d{2})$/.test(id)) continue;
  const section = prd.slice(0, prd.indexOf(line)).match(/^#{2,4} .*$/gm)?.at(-1) ?? '';
  // SCR-xxx는 인벤토리 표와 화면별 표에서 반복되지 않는다(화면별은 #### 제목). 같은 섹션 안 중복만 오류
  const key = `${section}::${id}`;
  if (seen.has(key)) errors.push(`중복 정의: ${id} (${section})`);
  seen.set(key, true);
}

// 범위 표기 확장: FR-001~010, SC-019~022, DATA-002~005, SCR-004-EL-02~04, EL-02~05(같은 셀의 앞 화면 기준)
function expand(prefix, a, b, width) {
  const out = [];
  for (let i = Number(a); i <= Number(b); i += 1) out.push(`${prefix}${String(i).padStart(width, '0')}`);
  return out;
}

function referencesIn(text) {
  const refs = new Set();
  for (const m of text.matchAll(/\b(FR|SC|DATA)-(\d{3})(?:~(\d{3}))?/g)) {
    expand(`${m[1]}-`, m[2], m[3] ?? m[2], 3).forEach((x) => refs.add(x));
  }
  for (const m of text.matchAll(/\bNAV-(\d{2})(?:~(\d{2}))?/g)) expand('NAV-', m[1], m[2] ?? m[1], 2).forEach((x) => refs.add(x));
  for (const m of text.matchAll(/\b(SCR-\d{3})-EL-(\d{2})(?:~(\d{2}))?/g)) {
    expand(`${m[1]}-EL-`, m[2], m[3] ?? m[2], 2).forEach((x) => refs.add(x));
  }
  for (const m of text.matchAll(/\b(SCR-\d{3})(?:~(\d{3}))?\b(?!-EL)/g)) {
    expand('SCR-', m[1].slice(4), m[2] ?? m[1].slice(4), 3).forEach((x) => refs.add(x));
  }
  for (const m of text.matchAll(/\b(NG|REF|NFR)-(\d+)/g)) refs.add(`${m[1]}-${m[2]}`);
  return refs;
}

const kindOf = (id) => (id.includes('-EL-') ? 'EL' : id.split('-')[0]);
for (const ref of referencesIn(prd)) {
  const kind = kindOf(ref);
  if (!defined[kind]) continue;
  if (!defined[kind].has(ref)) errors.push(`정의되지 않은 참조: ${ref}`);
}

// FR ↔ SC 연결
const frRows = rows.filter((l) => /^FR-\d{3}$/.test(firstCell(l)));
const scRows = rows.filter((l) => /^SC-\d{3}$/.test(firstCell(l)));
const scFromFr = new Map();
for (const line of frRows) {
  const cells = cellsOf(line);
  const [, id, , priority, , screens, data, scs, method] = cells;
  const scRefs = [...referencesIn(scs)].filter((x) => x.startsWith('SC-'));
  if (scRefs.length === 0 && !/NFR-/.test(scs)) errors.push(`${id}: 관련 SC 없음`);
  scRefs.forEach((s) => scFromFr.set(s, [...(scFromFr.get(s) ?? []), id]));
  if (!/^\[(E2E|통합|단위|수동)\]/.test(method)) errors.push(`${id}: 검증 방법이 검증 수단 라벨로 시작하지 않음`);
  if (priority.startsWith('P0') && !/해당 없음/.test(screens)) {
    const hasScreen = [...referencesIn(screens)].some((x) => x.startsWith('SCR-') || x.startsWith('NAV-'));
    if (!hasScreen) errors.push(`${id}: P0 화면 FR에 유효한 화면·요소 연결 없음`);
    if (![...referencesIn(data)].some((x) => x.startsWith('DATA-')) && !/해당 없음|—/.test(data)) {
      errors.push(`${id}: P0 FR에 DATA 연결 없음`);
    }
  }
}
for (const line of scRows) {
  const cells = cellsOf(line);
  const [, id, , related, method] = cells;
  if (!/^\[(E2E|통합|단위|수동)\]/.test(method)) errors.push(`${id}: 측정 방법이 검증 수단 라벨로 시작하지 않음`);
  const frRefs = [...referencesIn(related)].filter((x) => x.startsWith('FR-') || x.startsWith('NFR-'));
  if (frRefs.length === 0) errors.push(`${id}: 관련 FR 없음`);
  if (!scFromFr.has(id) && !frRefs.some((x) => x.startsWith('NFR-'))) warn.push(`${id}: 어떤 FR의 관련 SC 열에도 없음`);
}

// 화면 상태 표의 검증 SC가 정의되어 있는지는 위 참조 검사로 확인됨. 화면마다 상태 8종 확인
for (const m of prd.matchAll(/^#### (SCR-\d{3}) [^\n]*\n([\s\S]*?)(?=^#### |^## )/gm)) {
  const body = m[2];
  if (!/\| 상태 \| 정의 \| 검증 SC \|/.test(body)) errors.push(`${m[1]}: 화면 상태 표 없음`);
  if (!/디자인 참고/.test(body)) errors.push(`${m[1]}: 디자인 참고 없음`);
}

// E2E 테스트
const e2eDir = 'tests/e2e';
const specFiles = readdirSync(e2eDir).filter((f) => f.endsWith('.spec.ts'));
const specText = specFiles.map((f) => readFileSync(join(e2eDir, f), 'utf8')).join('\n')
  + readFileSync(join(e2eDir, 'support/app.ts'), 'utf8');
for (const line of scRows) {
  const cells = cellsOf(line);
  if (cells[4].startsWith('[E2E]') && !new RegExp(`test\\('${cells[1]} `).test(specText)) {
    errors.push(`${cells[1]}: [E2E]인데 tests/e2e에 테스트가 없음`);
  }
}
const usedIds = new Set();
for (const m of specText.matchAll(/['"`/^]((?:SCR-\d{3}-EL-\d{2}|NAV-\d{2}|FOOTER-NOTICE|ERROR-PAGE)(?:-[A-Za-z]+)?)/g)) usedIds.add(m[1]);
// tid(page, 'SCR-xxx-EL-yy', ..., 'suffix') 형태의 정적 접미사
const suffixes = new Set();
for (const m of specText.matchAll(/tid\([^)]*?'((?:SCR-\d{3}-EL-\d{2}|NAV-\d{2}))'(?:,[^)]*)?,\s*'([a-zA-Z]+)'\)/g)) suffixes.add(`${m[1]}::${m[2]}`);
for (const id of usedIds) {
  const base = id.match(/^(SCR-\d{3}-EL-\d{2}|NAV-\d{2}|FOOTER-NOTICE|ERROR-PAGE)/)[1];
  if (base.startsWith('SCR-') && !defined.EL.has(base)) errors.push(`E2E testid ${id}: PRD에 요소 ${base} 정의 없음`);
  if (base.startsWith('NAV-') && !defined.NAV.has(base)) errors.push(`E2E testid ${id}: PRD에 메뉴 ${base} 정의 없음`);
  if (!base.startsWith('SCR-') && !base.startsWith('NAV-') && !prd.includes(base)) errors.push(`E2E testid ${id}: PRD에 없음`);
}
for (const pair of suffixes) {
  const [base, suffix] = pair.split('::');
  const line = rows.find((l) => firstCell(l) === base) ?? '';
  const ok = line.includes(`-${suffix}`) || new RegExp(`\\(${suffix}[):,]`).test(line)
    || line.includes(`\`${suffix}\``) || line.includes(`${suffix}|`) || line.includes(`${suffix}\\|`)
    || line.includes(`|${suffix}`) || line.includes(`{${suffix}`);
  if (!ok) errors.push(`E2E testid 접미사 ${base}-${suffix}: PRD ${base} 행에 정의 없음`);
}

// 계약 섹션의 미정 표현
const contract = prd.split('## 12.')[0];
for (const word of ['TBD', 'TODO', '추후 결정', '미정 표현']) {
  if (contract.includes(word)) errors.push(`계약 섹션에 미정 표현: ${word}`);
}

const summary = Object.fromEntries(Object.entries(defined).map(([k, v]) => [k, v.size]));
console.log(`PRD 검사: ${prdPath}`, summary, `E2E 파일 ${specFiles.length}개, testid ${usedIds.size}종`);
warn.forEach((w) => console.log(`경고: ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`오류: ${e}`));
  process.exit(1);
}
console.log('통과: 오류 0건');
