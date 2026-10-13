import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';
import { asOfDate, fleet, fleetKpis, GRADE_LABELS, PLAN_STATUS_LABELS } from '@/lib/queries';
import FleetTable, { type FleetTableRow } from './FleetTable';
import AdminReset from './AdminReset';

export const dynamic = 'force-dynamic';

// SCR-002 선대 위험 현황
export default async function FleetPage() {
  const user = await requireUser('/fleet');
  const rows = fleet();
  const kpi = fleetKpis(rows);
  const tableRows: FleetTableRow[] = rows.map((r) => ({
    vesselId: r.vesselId,
    name: r.name,
    shipType: r.shipType,
    builtYear: r.builtYear,
    pending: r.pending,
    maxGrade: r.maxGrade,
    maxGradeLabel: r.maxGrade ? GRADE_LABELS[r.maxGrade] : '미실행',
    planStatusLabel: r.planStatus ? PLAN_STATUS_LABELS[r.planStatus] : '없음',
  }));

  return (
    <AppShell user={user}>
      <section className="product-tile-light" data-testid="SCR-002-EL-01">
        <h1>선대 위험 현황</h1>
        <p className="caption">기준일 {asOfDate()}</p>
      </section>
      <div className="kpi-grid">
        <Kpi id="SCR-002-EL-02" label="관리 선박" value={`${kpi.vessels}척`} />
        <Kpi id="SCR-002-EL-03" label="미검토 판독" value={`${kpi.pending}건`} />
        <Kpi id="SCR-002-EL-04" label="고위험 부재" value={`${kpi.high}개`} />
        <Kpi id="SCR-002-EL-05" label="승인 대기 계획" value={`${kpi.awaitingApproval}건`} />
      </div>
      <FleetTable rows={tableRows} adminSlot={user.role === 'admin' ? <AdminReset /> : null} />
    </AppShell>
  );
}

function Kpi({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="store-utility-card" data-testid={id}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
