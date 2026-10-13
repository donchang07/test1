import Link from 'next/link';
import AppShell from '@/components/AppShell';
import VesselSubNav from '@/components/VesselSubNav';
import { formatDateTime, PLAN_STATUS_LABELS, type FleetRow } from '@/lib/queries';
import { loadVesselPage } from '@/lib/vessel-page';

export const dynamic = 'force-dynamic';

function nextStep(v: FleetRow): { label: string; path: string } {
  if (v.pending > 0) return { label: '판독 시작하기', path: '/review' };
  if (!v.latestRunAt) return { label: '시뮬레이션 실행하기', path: '/simulate' };
  if (!v.planStatus || v.planStatus === 'rejected') return { label: '검사 계획 만들기', path: '/plan' };
  return { label: '계획 보기', path: '/plan' };
}

// SCR-003 선박 개요
export default async function VesselOverview({ params }: { params: Promise<{ vesselId: string }> }) {
  const { vesselId } = await params;
  const { user, vessel: v } = await loadVesselPage(vesselId, '');
  const step = nextStep(v);
  const base = `/vessels/${v.vesselId}`;

  return (
    <AppShell user={user} subNav={<VesselSubNav vesselId={v.vesselId} name={v.name} active="" pending={v.pending} />}>
      <section className="product-tile-dark" data-testid="SCR-003-EL-01">
        <h1>{v.name}</h1>
        <p className="caption">{v.vesselId} · {v.shipType}</p>
      </section>
      <div className="store-utility-card" data-testid="SCR-003-EL-02" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <span>건조 {v.builtYear}</span>
        <span>총톤수 {v.grossTonnage.toLocaleString('ko-KR')}</span>
        <span>선급부호 {v.classNotation}</span>
        <span>다음 정기검사 {v.nextSpecialSurveyDue}</span>
      </div>
      <div className="step-grid">
        <StepCard id="SCR-003-EL-03" href={`${base}/review`} title="① 판독"
          status={v.imageCount === 0 ? '이미지 없음' : v.pending > 0 ? `미검토 ${v.pending}건` : '모두 검토됨'} />
        <StepCard id="SCR-003-EL-04" href={`${base}/forecast`} title="② 예측"
          status={v.pending > 0 ? `미검토 판독 ${v.pending}건 미반영` : '최신'} />
        <StepCard id="SCR-003-EL-05" href={`${base}/simulate`} title="③ 시뮬레이션"
          status={v.latestRunAt ? `최근 실행 ${formatDateTime(v.latestRunAt)}` : '미실행'} />
        <StepCard id="SCR-003-EL-06" href={`${base}/plan`} title="④ 계획"
          status={v.planStatus ? PLAN_STATUS_LABELS[v.planStatus] : '없음'} />
      </div>
      <Link href={`${base}${step.path}`} className="button-primary" data-testid="SCR-003-EL-07">{step.label}</Link>
    </AppShell>
  );
}

function StepCard({ id, href, title, status }: { id: string; href: string; title: string; status: string }) {
  return (
    <Link href={href} className="store-utility-card" data-testid={id}>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div className="caption">{status}</div>
    </Link>
  );
}
