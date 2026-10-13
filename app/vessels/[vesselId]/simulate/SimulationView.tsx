'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Route = 'calm' | 'moderate' | 'harsh';
type Grade = 'high' | 'medium' | 'low';
type Row = {
  memberId: string; name: string; zone: string; tPred: number; ci: number; fatigue: number; pof: number;
  criticality: number; risk: number; grade: Grade; crack: boolean;
};
export type RunView = {
  runId: string; horizonYears: number; route: Route; createdAtText: string; allowablePct: number;
  rows: Row[]; counts: Record<Grade, number>;
};

const ROUTES: Array<{ key: Route; label: string }> = [{ key: 'calm', label: '온화' }, { key: 'moderate', label: '보통' }, { key: 'harsh', label: '황천' }];
const ROUTE_LABEL: Record<Route, string> = { calm: '온화', moderate: '보통', harsh: '황천' };
const GRADE_LABEL: Record<Grade, string> = { high: '높음', medium: '중간', low: '낮음' };
const RANK: Record<Grade, number> = { high: 3, medium: 2, low: 1 };

/** Asia/Seoul `YYYY-MM-DD HH:mm` */
function seoulTime(iso: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

// SCR-006 ③ 시나리오 시뮬레이션: EL-01~11
export default function SimulationView({ vesselId, runs: initialRuns, selectedId }: {
  vesselId: string; runs: RunView[]; selectedId: string | null;
}) {
  const router = useRouter();
  const [runs, setRuns] = useState(initialRuns);
  const [current, setCurrent] = useState<string | null>(selectedId);
  const [horizon, setHorizon] = useState(3);
  const [route, setRoute] = useState<Route>('moderate');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [zone, setZone] = useState<string | null>(null);

  const run = runs.find((r) => r.runId === current) ?? null;
  const history = runs.slice(0, 5);

  function show(runId: string) {
    setCurrent(runId);
    setZone(null);
    const url = new URL(window.location.href);
    url.searchParams.set('run', runId);
    window.history.replaceState(null, '', url);
  }

  async function execute() {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/vessels/${encodeURIComponent(vesselId)}/simulations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horizonYears: horizon, route }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { run: r } = await res.json();
      const view: RunView = {
        runId: r.runId, horizonYears: r.horizonYears, route: r.route, createdAtText: seoulTime(r.createdAt),
        allowablePct: r.params.allowableDiminutionPct, rows: r.rows, counts: r.counts,
      };
      setRuns((list) => [view, ...list.filter((x) => x.runId !== view.runId)]);
      show(view.runId);
      router.refresh();
    } catch {
      setFailed(true);
    }
    setLoading(false);
  }

  const zones = run ? [...new Set(run.rows.map((r) => r.zone))] : [];
  const zoneGrade = (z: string) => run!.rows.filter((r) => r.zone === z)
    .reduce<Grade>((g, r) => (RANK[r.grade] > RANK[g] ? r.grade : g), 'low');
  const rows = run ? run.rows.filter((r) => !zone || r.zone === zone) : [];
  const top = run?.rows[0];

  return (
    <>
      <div className="conditions">
        <div className="chip-group" role="group" aria-label="기간">
          {[1, 3, 5].map((h) => (
            <button key={h} type="button" className="configurator-option-chip" aria-pressed={horizon === h}
              data-testid={`SCR-006-EL-01-${h}`} onClick={() => setHorizon(h)}>{h}년</button>
          ))}
        </div>
        <div className="chip-group" role="group" aria-label="해상 조건">
          {ROUTES.map((r) => (
            <button key={r.key} type="button" className="configurator-option-chip" aria-pressed={route === r.key}
              data-testid={`SCR-006-EL-02-${r.key}`} onClick={() => setRoute(r.key)}>{r.label}</button>
          ))}
        </div>
        <div className="run-row">
          <button type="button" className="button-primary" data-testid="SCR-006-EL-03" disabled={loading} onClick={execute}>시뮬레이션 실행</button>
          {loading && <span className="loading" role="status" data-testid="SCR-006-EL-04"><span className="spinner" aria-hidden="true" />계산 중…</span>}
        </div>
      </div>

      {failed && (
        <div className="inline-alert error" role="alert" data-testid="SCR-006-EL-10">시뮬레이션을 실행하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.</div>
      )}

      {!run ? (
        <div className="inline-alert" role="status" data-testid="SCR-006-EL-09">아직 실행한 시뮬레이션이 없습니다. 조건을 고르고 실행하세요.</div>
      ) : (
        <>
          <section className="store-utility-card sim-summary" data-testid="SCR-006-EL-05">
            <p className="counts">높음 {run.counts.high} · 중간 {run.counts.medium} · 낮음 {run.counts.low}</p>
            {top && <p>최고 위험: {top.name} ({top.risk}점)</p>}
            <p className="caption">조건: {run.horizonYears}년 · {ROUTE_LABEL[run.route]} · 허용 쇠모율 {run.allowablePct}%</p>
          </section>

          <div className="zone-map" data-testid="SCR-006-EL-07" role="group" aria-label="구역 위험 맵">
            {zones.map((z) => {
              const g = zoneGrade(z);
              return (
                <button key={z} type="button" className={`zone-tile ${g}`} aria-pressed={zone === z}
                  data-testid={`SCR-006-EL-07-${z}`} onClick={() => setZone(zone === z ? null : z)}>
                  <span className="zone-name">{z}</span>
                  <span className={`status-badge ${g}`}>{GRADE_LABEL[g]}</span>
                </button>
              );
            })}
          </div>

          <div className="table-wrap">
            <table className="data-table" data-testid="SCR-006-EL-06">
              <thead>
                <tr>
                  <th scope="col">부재</th><th scope="col" className="num">예측 두께</th><th scope="col" className="num">상태지수</th>
                  <th scope="col" className="num hide-sm">피로 누적</th><th scope="col" className="num">파손확률지표</th>
                  <th scope="col" className="num hide-sm">중요도</th><th scope="col" className="num">위험점수</th><th scope="col">등급</th><th scope="col">균열 확정</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const id = `SCR-006-EL-06-${r.memberId}`;
                  return (
                    <tr key={r.memberId} data-testid={id}>
                      <td data-testid={`${id}-name`}>{r.name}</td>
                      <td className="num" data-testid={`${id}-tPred`}>{r.tPred.toFixed(2)}</td>
                      <td className="num" data-testid={`${id}-ci`}>{r.ci.toFixed(2)}</td>
                      <td className="num hide-sm" data-testid={`${id}-fatigue`}>{r.fatigue.toFixed(2)}</td>
                      <td className="num" data-testid={`${id}-pof`}>{r.pof.toFixed(2)}</td>
                      <td className="num hide-sm" data-testid={`${id}-criticality`}>{r.criticality}</td>
                      <td className="num" data-testid={`${id}-risk`}>{r.risk}</td>
                      <td data-testid={`${id}-grade`}><span className={`status-badge ${r.grade}`}>{GRADE_LABEL[r.grade]}</span></td>
                      <td data-testid={`${id}-crack`}>{r.crack ? '예' : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {history.length > 0 && (
        <div className="table-wrap">
          <table className="data-table history" data-testid="SCR-006-EL-08">
            <caption className="section-title">실행 이력</caption>
            <tbody>
              {history.map((h) => (
                <tr key={h.runId} data-testid={`SCR-006-EL-08-${h.runId}`} role="link" tabIndex={0}
                  aria-current={h.runId === current ? 'true' : undefined}
                  onClick={() => show(h.runId)} onKeyDown={(e) => { if (e.key === 'Enter') show(h.runId); }}>
                  <td>{h.createdAtText} · {h.horizonYears}년 · {ROUTE_LABEL[h.route]} · 높음 {h.counts.high}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {run && <p><Link href={`/vessels/${vesselId}/plan`} className="button-primary" data-testid="SCR-006-EL-11">검사 계획 최적화로</Link></p>}
    </>
  );
}
