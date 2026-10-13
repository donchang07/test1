#!/usr/bin/env node
// docs/PRD.md(정본) 14장 feature 표를 읽어 docs/00-pm/{feature}.prd.md 파생본을 만든다.
// 파생본은 직접 고치지 않는다. 정본을 고친 뒤 이 스크립트를 다시 실행한다.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const prd = readFileSync('docs/PRD.md', 'utf8');
const revision = prd.match(/\| 정본 개정 \| (v\d+\.\d+) \|/)[1];

// 제목(##, ###, ####) 단위로 자른다.
function section(startHeading, levels = 2) {
  const start = prd.indexOf(startHeading);
  if (start < 0) throw new Error(`정본에 없음: ${startHeading}`);
  const rest = prd.slice(start + startHeading.length);
  const stop = new RegExp(`^#{1,${levels}} `, 'm');
  const end = rest.search(stop);
  return startHeading + (end < 0 ? rest : rest.slice(0, end));
}

const cellsOf = (line) => line.split(/(?<!\\)\|/).map((c) => c.trim());
const range = (prefix, a, b, width) => Array.from({ length: Number(b) - Number(a) + 1 },
  (_, i) => `${prefix}${String(Number(a) + i).padStart(width, '0')}`);

function ids(text, kind, width) {
  const out = [];
  for (const m of text.matchAll(new RegExp(`${kind}-(\\d{${width}})(?:~(\\d{${width}}))?`, 'g'))) {
    out.push(...range(`${kind}-`, m[1], m[2] ?? m[1], width));
  }
  return out;
}

function filterTable(block, keep) {
  return block.split('\n').filter((line) => {
    if (!line.startsWith('| ')) return true;
    const first = cellsOf(line)[1];
    if (!/^[A-Z]+-\d/.test(first)) return true; // 머리글·구분선
    return keep(first, line);
  }).join('\n');
}

const featureRows = section('## 14. feature 분해').split('\n')
  .filter((l) => /^\| \d+ \| `/.test(l))
  .map((l) => {
    const c = cellsOf(l);
    return {
      order: c[1], slug: c[2].replace(/`/g, ''), screensText: c[3], frText: c[4], scText: c[5], dataText: c[6],
      depends: c[7], size: c[8], line: l,
    };
  });

const header14 = section('## 14. feature 분해').split('\n').slice(0, 4).join('\n');

mkdirSync('docs/00-pm', { recursive: true });

for (const f of featureRows) {
  const screens = ids(f.screensText, 'SCR', 3);
  const navs = ids(f.screensText, 'NAV', 2);
  const frs = new Set(ids(f.frText, 'FR', 3));
  const scs = new Set(ids(f.scText, 'SC', 3));
  // 데이터 열은 `DATA-002~005, 011`처럼 접두사를 생략하므로 숫자만 모은다.
  const datas = [...f.dataText.matchAll(/(\d{3})(?:~(\d{3}))?/g)].flatMap((m) => range('DATA-', m[1], m[2] ?? m[1], 3));

  const screenBlocks = screens.map((s) => section(`#### ${s} `, 4)).join('\n');
  const common = section('### 5.5 화면별 상세 계약', 4);
  const inventory = filterTable(section('### 5.1 화면 인벤토리', 3), (id) => screens.includes(id));
  const menus = filterTable(section('### 5.3 메뉴', 3), (id) => navs.includes(id));
  const frTable = filterTable(section('## 6. 기능 요구사항', 2).split('### 6.1')[0], (id) => frs.has(id));
  const nfr = section('### 6.1 비기능 요구사항', 3);
  const scTable = filterTable(section('## 7. 완료 판정 기준'), (id) => scs.has(id));
  const errorsBlock = section('## 8. 오류·경계 처리').split('\n').filter((line) => {
    if (!line.startsWith('| ') || line.startsWith('| 상황') || line.startsWith('|---')) return true;
    return screens.some((s) => line.includes(s)) || /해당 없음 — API/.test(line);
  }).join('\n');
  const dataBlocks = datas.map((d) => section(`### ${d} `, 3)).join('\n');

  const doc = [
    `# ${f.slug} — KR Smart RBI feature PRD`,
    '',
    '| 항목 | 값 |',
    '|---|---|',
    `| 정본 | \`docs/PRD.md\` ${revision} |`,
    '| 성격 | 파생본 — 직접 편집 금지. 정본 수정 후 `node scripts/derive-feature-prds.mjs`로 재생성 |',
    `| 순서·의존 | ${f.order} · ${f.depends} |`,
    `| 규모 | ${f.size} |`,
    `| 첫 명령 | \`/pdca plan ${f.slug}\` |`,
    '',
    section('### Context Anchor', 3).replace('### Context Anchor', '## 0. Context Anchor'),
    section('### 3.2 비목표', 3).replace('### 3.2 비목표', '## 1. 비목표(정본 3.2 전체)'),
    section('### 4.1 역할', 3).replace('### 4.1 역할', '## 2. 역할'),
    section('### 4.2 시나리오', 3).replace('### 4.2 시나리오', '## 3. 시나리오(정본 전체)'),
    '## 4. 화면 계약',
    '',
    `### 4.0 이 feature 범위\n\n${header14}\n${f.line}\n`,
    inventory.replace('### 5.1', '### 4.1'),
    menus.replace('### 5.3', '### 4.2'),
    section('### 5.4 인증', 3).replace('### 5.4', '### 4.3'),
    common.replace('### 5.5 화면별 상세 계약', '### 4.4 공통 규칙과 화면별 상세 계약'),
    screenBlocks,
    frTable.replace('## 6. 기능 요구사항', '## 5. 기능 요구사항'),
    nfr.replace('### 6.1', '### 5.1'),
    scTable.replace('## 7. 완료 판정 기준', '## 6. 완료 판정 기준'),
    errorsBlock.replace('## 8.', '## 7.'),
    section('## 9. 브랜드·디자인').replace('## 9.', '## 8.'),
    section('## 11. 레벨·스택·시스템 가정').replace('## 11.', '## 9.'),
    section('## 13. 작성자 결정 필요').replace('## 13.', '## 10.'),
    section('## 15. bkit 실행 계약').replace('## 15.', '## 11.'),
    `## 부록 A. 데이터 계약(이 feature)\n\n${dataBlocks}`,
  ].join('\n');

  writeFileSync(`docs/00-pm/${f.slug}.prd.md`, `${doc.replace(/\n{3,}/g, '\n\n').trim()}\n`);
  console.log(`생성: docs/00-pm/${f.slug}.prd.md (화면 ${screens.length}, FR ${frs.size}, SC ${scs.size}, DATA ${datas.length})`);
}
