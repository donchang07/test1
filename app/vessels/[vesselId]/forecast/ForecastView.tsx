'use client';

import { useState } from 'react';

export type ForecastRow = {
  memberId: string; name: string; zone: string; t0: number; lastMm: number; lastDate: string; renewal: number;
  rate: number; factor: number; renewalYear: number | null; insufficient: boolean;
  points: Array<{ year: number; mm: number }>; lastYear: number;
};

type Sort = 'renewal' | 'member';
const fmtYear = (y: number | null) => (y === null ? '도달 안 함' : y.toFixed(1));

function sortRows(rows: ForecastRow[], sort: Sort) {
  return [...rows].sort(sort === 'member'
    ? (a, b) => a.memberId.localeCompare(b.memberId)
    : (a, b) => (a.renewalYear ?? Infinity) - (b.renewalYear ?? Infinity) || a.memberId.localeCompare(b.memberId));
}

// SCR-005-EL-03~07: 예측 표, 정렬 칩, 상세 패널·차트
export default function ForecastView({ rows, defaultRate, chartEnd, initialSort, initialMember }: {
  rows: ForecastRow[]; defaultRate: number; chartEnd: number; initialSort: Sort; initialMember: string | null;
}) {
  const [sort, setSort] = useState<Sort>(initialSort);
  const sorted = sortRows(rows, sort);
  const [selected, setSelected] = useState<string>(
    initialMember && rows.some((r) => r.memberId === initialMember) ? initialMember : sorted[0].memberId,
  );
  const current = rows.find((r) => r.memberId === selected)!;

  function updateUrl(nextSort: Sort, member: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('sort', nextSort);
    url.searchParams.set('member', member);
    window.history.replaceState(null, '', url);
  }
  function chooseSort(next: Sort) {
    setSort(next);
    updateUrl(next, selected);
  }
  function choose(memberId: string) {
    setSelected(memberId);
    updateUrl(sort, memberId);
  }

  return (
    <>
      <div className="toolbar">
        <div className="chip-group" role="group" aria-label="정렬">
          <button type="button" className="configurator-option-chip" aria-pressed={sort === 'renewal'} data-testid="SCR-005-EL-04-renewal"
            onClick={() => chooseSort('renewal')}>교체 도달 빠른 순</button>
          <button type="button" className="configurator-option-chip" aria-pressed={sort === 'member'} data-testid="SCR-005-EL-04-member"
            onClick={() => chooseSort('member')}>부재 순</button>
        </div>
      </div>
      <div className="split">
        <div className="table-wrap">
          <table className="data-table" data-testid="SCR-005-EL-03">
            <thead>
              <tr>
                <th scope="col">부재</th><th scope="col" className="hide-sm">구역</th><th scope="col" className="num">원설계</th>
                <th scope="col" className="num">최근 실측</th><th scope="col" className="num">교체 기준</th><th scope="col" className="num">부식 속도</th>
                <th scope="col" className="num">판독 보정</th><th scope="col" className="num">교체 도달</th><th scope="col">데이터</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const id = `SCR-005-EL-03-${r.memberId}`;
                return (
                  <tr key={r.memberId} data-testid={id} role="link" tabIndex={0} aria-current={r.memberId === selected ? 'true' : undefined}
                    onClick={() => choose(r.memberId)} onKeyDown={(e) => { if (e.key === 'Enter') choose(r.memberId); }}>
                    <td data-testid={`${id}-name`}>{r.name}</td>
                    <td className="hide-sm" data-testid={`${id}-zone`}>{r.zone}</td>
                    <td className="num" data-testid={`${id}-t0`}>{r.t0.toFixed(2)}</td>
                    <td className="num" data-testid={`${id}-last`}>{r.lastMm.toFixed(2)} ({r.lastDate})</td>
                    <td className="num" data-testid={`${id}-renewal`}>{r.renewal.toFixed(2)}</td>
                    <td className="num" data-testid={`${id}-rate`}>{r.rate.toFixed(3)}</td>
                    <td className="num" data-testid={`${id}-factor`}>×{r.factor.toFixed(2)}</td>
                    <td className="num" data-testid={`${id}-renewalYear`}>{fmtYear(r.renewalYear)}</td>
                    <td data-testid={`${id}-status`}>
                      {r.insufficient
                        ? <span className="status-badge medium" data-testid={`SCR-005-EL-07-${r.memberId}`}
                          title={`실측이 1회뿐이라 기본 부식 속도 ${defaultRate} mm/년을 적용했습니다.`}>데이터 부족</span>
                        : '정상'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <section className="store-utility-card detail" data-testid="SCR-005-EL-05" aria-live="polite">
          <h2>{current.name}</h2>
          <Chart row={current} end={chartEnd} />
        </section>
      </div>
    </>
  );
}

// chart-line(PRD 9.3): 실측 점, 예측 점선, 교체 기준 수평선(#b42318 점선)
function Chart({ row, end }: { row: ForecastRow; end: number }) {
  const W = 480; const H = 260; const L = 48; const R = 12; const T = 12; const B = 32;
  const start = Math.floor(row.points[0].year);
  const x0 = start; const x1 = Math.ceil(end);
  const predEndMm = row.lastMm - row.rate * (end - row.lastYear);
  const ys = [...row.points.map((p) => p.mm), row.renewal, predEndMm, row.t0];
  const yMin = Math.floor(Math.min(...ys) - 0.5); const yMax = Math.ceil(Math.max(...ys) + 0.5);
  const sx = (x: number) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const sy = (y: number) => T + ((yMax - y) / (yMax - yMin)) * (H - T - B);
  const years = Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i).filter((y, i, a) => a.length <= 8 || i % 2 === 0);
  const ticks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4);
  return (
    <figure className="chart" data-testid="SCR-005-EL-06">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${row.name} 두께 추이: 실측 ${row.points.length}회, 교체 기준 ${row.renewal.toFixed(2)}mm, 교체 도달 ${fmtYear(row.renewalYear)}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} className="grid" />
            <text x={L - 6} y={sy(t) + 4} textAnchor="end" className="axis">{t.toFixed(1)}</text>
          </g>
        ))}
        {years.map((y) => <text key={y} x={sx(y)} y={H - 10} textAnchor="middle" className="axis">{y}</text>)}
        <line x1={sx(x0)} x2={sx(x1)} y1={sy(row.renewal)} y2={sy(row.renewal)} className="renewal" />
        <line x1={sx(row.lastYear)} x2={sx(end)} y1={sy(row.lastMm)} y2={sy(predEndMm)} className="predict" />
        {row.points.map((p) => <circle key={p.year} cx={sx(p.year)} cy={sy(p.mm)} r={4} className="measured" />)}
      </svg>
      <figcaption className="legend">
        <span><i className="dot measured" />실측</span>
        <span><i className="line predict" />예측</span>
        <span><i className="line renewal" />교체 기준</span>
      </figcaption>
    </figure>
  );
}
