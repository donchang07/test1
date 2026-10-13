import AppShell from '@/components/AppShell';
import VesselSubNav from '@/components/VesselSubNav';
import { ROUTE_LABELS } from '@/lib/model';
import { getPlan } from '@/lib/plan';
import { formatDateTime } from '@/lib/queries';
import { currentParams } from '@/lib/settings';
import { latestRun } from '@/lib/simulation';
import { loadVesselPage } from '@/lib/vessel-page';
import PlanView, { type PlanData } from './PlanView';

export const dynamic = 'force-dynamic';

// SCR-007 ④ 검사 계획 (11.4.4)
export default async function PlanPage({ params }: { params: Promise<{ vesselId: string }> }) {
  const { vesselId } = await params;
  const { user, vessel } = await loadVesselPage(vesselId, '/plan');
  const run = latestRun(vessel.vesselId);
  const plan = getPlan(vessel.vesselId);
  const basis = run ? `기준 시뮬레이션: ${formatDateTime(run.createdAt)} · ${run.horizonYears}년 · ${ROUTE_LABELS[run.route]}` : null;
  return (
    <AppShell user={user} subNav={<VesselSubNav vesselId={vessel.vesselId} name={vessel.name} active="/plan" pending={vessel.pending} />}>
      <section className="product-tile-light"><h1>④ 검사 계획</h1></section>
      <PlanView vesselId={vessel.vesselId} isAdmin={user.role === 'admin'} basis={basis}
        defaultBudget={currentParams().defaultBudgetHours} initial={plan as PlanData | null} />
    </AppShell>
  );
}
