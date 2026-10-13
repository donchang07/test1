#!/usr/bin/env node
// 정본 PRD(Markdown)를 읽기용 HTML로 변환한다. Apple DESIGN.md 토큰 + Pretendard, 목차, ID 앵커.
// 사용법: node scripts/render-prd-html.mjs docs/PRD.md docs/PRD.html

import { readFileSync, writeFileSync } from 'node:fs';
import { marked } from 'marked';

const [input = 'docs/PRD.md', output = 'docs/PRD.html'] = process.argv.slice(2);
// GFM은 '~' 하나도 취소선으로 읽어 'FR-012~019' 같은 범위를 지운다. 숫자 사이 '~'는 엔티티로 바꾼다.
const md = readFileSync(input, 'utf8').replace(/(\d)~(\d)/g, '$1&#126;$2');
const title = md.match(/^# (.+)$/m)?.[1] ?? 'PRD';

const headings = [];
const slugCount = new Map();
const renderer = new marked.Renderer();
renderer.heading = function heading({ tokens, depth }) {
  const text = this.parser.parseInline(tokens);
  const plain = text.replace(/<[^>]+>/g, '');
  let slug = plain.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
  const n = slugCount.get(slug) ?? 0;
  slugCount.set(slug, n + 1);
  if (n) slug = `${slug}-${n}`;
  const idMatch = plain.match(/^(SCR-\d{3}|DATA-\d{3})\b/);
  const id = idMatch ? idMatch[1] : slug;
  if (depth >= 2 && depth <= 4) headings.push({ depth, id, text: plain });
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};

let html = marked.parse(md, { renderer, gfm: true });

// 표의 첫 열 ID에 앵커를 달고, 본문의 ID 참조를 링크로 바꾼다.
const anchorIds = new Set(headings.map((h) => h.id));
// 정의 행(행의 첫 칸)의 첫 등장에만 앵커를 단다.
html = html.replace(/<tr>\n<td>((?:SCR-\d{3}-EL-\d{2}|NAV-\d{2}|FR-\d{3}|SC-\d{3}|NG-\d+|REF-\d{2}|NFR-\d{2}))<\/td>/g, (m, id) => {
  if (anchorIds.has(id)) return m;
  anchorIds.add(id);
  return `<tr>\n<td id="${id}" class="id">${id}</td>`;
});
html = html.replace(/(<td(?: [^>]*)?>)([\s\S]*?)(<\/td>)/g, (m, open, body, close) => {
  if (open.includes('class="id"')) return m;
  const linked = body.replace(/\b(SCR-\d{3}-EL-\d{2}|SCR-\d{3}|NAV-\d{2}|FR-\d{3}|SC-\d{3}|NG-\d+|REF-\d{2}|NFR-\d{2}|DATA-\d{3})\b(?![^<]*>)/g,
    (id) => (anchorIds.has(id) ? `<a href="#${id}">${id}</a>` : id));
  return open + linked + close;
});

const toc = headings
  .filter((h) => h.depth <= 3 || /^SCR-/.test(h.id))
  .map((h) => `<li class="d${h.depth}"><a href="#${h.id}">${h.text}</a></li>`).join('');

const page = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/pretendard.min.css">
<style>
:root{--primary:#0066cc;--ink:#1d1d1f;--muted:#7a7a7a;--parchment:#f5f5f7;--hairline:#e0e0e0;--canvas:#fff;--tile:#272729}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--primary:#2997ff;--ink:#f5f5f7;--muted:#a1a1a6;--parchment:#1c1c1e;--hairline:#3a3a3c;--canvas:#000;--tile:#272729}}
*{box-sizing:border-box}
body{margin:0;background:var(--canvas);color:var(--ink);font-family:Pretendard,system-ui,-apple-system,sans-serif;font-size:17px;line-height:1.47;letter-spacing:-0.374px}
header{background:#000;color:#fff;height:44px;display:flex;align-items:center;padding:0 16px;font-size:12px;position:sticky;top:0;z-index:2}
.layout{display:grid;grid-template-columns:280px minmax(0,1fr);max-width:1440px;margin:0 auto}
nav.toc{position:sticky;top:44px;height:calc(100vh - 44px);overflow:auto;padding:24px 16px;background:var(--parchment);font-size:14px;letter-spacing:-0.224px}
nav.toc ul{list-style:none;margin:0;padding:0}
nav.toc li{margin:2px 0}
nav.toc li.d3{padding-left:12px}
nav.toc li.d4{padding-left:24px}
nav.toc a{color:var(--ink);text-decoration:none}
nav.toc a:hover{color:var(--primary)}
main{padding:48px 32px 80px;min-width:0}
h1{font-size:40px;font-weight:600;line-height:1.1;margin:0 0 24px}
h2{font-size:28px;font-weight:600;margin:64px 0 16px;padding-top:24px;border-top:1px solid var(--hairline)}
h3{font-size:21px;font-weight:600;margin:40px 0 12px}
h4{font-size:17px;font-weight:600;margin:48px 0 12px;padding:16px 20px;background:var(--tile);color:#fff;border-radius:8px}
a{color:var(--primary)}
table{border-collapse:collapse;width:100%;margin:12px 0 24px;font-size:14px;letter-spacing:-0.224px;display:block;overflow-x:auto}
th,td{border-bottom:1px solid var(--hairline);padding:8px 10px;text-align:left;vertical-align:top}
th{font-weight:600;background:var(--parchment);position:sticky;top:0}
td.id{font-weight:600;white-space:nowrap}
:target{outline:2px solid var(--primary);outline-offset:-2px}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.88em;background:var(--parchment);padding:1px 5px;border-radius:5px}
pre{background:var(--parchment);padding:16px;border-radius:8px;overflow:auto;font-size:13px}
pre code{background:none;padding:0}
hr{border:0;border-top:1px solid var(--hairline);margin:32px 0}
@media (max-width:833px){.layout{display:block}nav.toc{position:static;height:auto;max-height:40vh}main{padding:24px 16px 64px}h1{font-size:28px}}
</style>
</head>
<body>
<header>KR Smart RBI · PRD 읽기용 사본 — 정본은 docs/PRD.md (이 파일은 생성물이므로 직접 고치지 않음)</header>
<div class="layout">
<nav class="toc" aria-label="목차"><ul>${toc}</ul></nav>
<main>
${html}
</main>
</div>
</body>
</html>
`;

writeFileSync(output, page);
console.log(`HTML 생성: ${output} (제목 ${headings.length}개)`);
