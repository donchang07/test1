import AppShell from '@/components/AppShell';
import VesselSubNav from '@/components/VesselSubNav';
import { formatDateTime } from '@/lib/queries';
import { getRun, recentRuns, type SimRun } from '@/lib/simulation';
import { loadVesselPage } from '@/lib/vessel-page';
import SimulationView, { type RunView } from './SimulationView';

export const dynamic = 'force-dynamic';

const toView = (r: SimRun): RunView => ({
  runId: r.runId, horizonYears: r.horizonYears, route: r.route, createdAtText: formatDateTime(r.createdAt),
  allowablePct: r.params.allowableDiminutionPct, rows: r.rows, counts: r.counts,
});

// SCR-006 ③ 시나리오 시뮬레이션 (11.4.3)
export default async function SimulatePage({ params, searchParams }: {
  params: Promise<{ vesselId: string }>; searchParams: Promise<{ run?: string }>;
}) {
  const { vesselId } = await params;
  const { run } = await searchParams;
  const { user, vessel } = await loadVesselPage(vesselId, '/simulate');
  const runs = recentRuns(vessel.vesselId);
  const picked = run ? getRun(vessel.vesselId, run) : null;
  const all = picked && !runs.some((r) => r.runId === picked.runId) ? [...runs, picked] : runs;
  const selected = picked?.runId ?? runs[0]?.runId ?? null;
  return (
    <AppShell user={user} subNav={<VesselSubNav vesselId={vessel.vesselId} name={vessel.name} active="/simulate" pending={vessel.pending} />}>
      <section className="product-tile-light"><h1>③ 시나리오 시뮬레이션</h1></section>
      <SimulationView vesselId={vessel.vesselId} runs={all.map(toView)} selectedId={selected} />
    </AppShell>
  );
}
