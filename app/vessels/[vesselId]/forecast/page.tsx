import Link from 'next/link';
import AppShell from '@/components/AppShell';
import VesselSubNav from '@/components/VesselSubNav';
import { asOf, currentModelParams, decimalYear, forecastVessel } from '@/lib/model';
import { loadVesselPage } from '@/lib/vessel-page';
import ForecastView, { type ForecastRow } from './ForecastView';

export const dynamic = 'force-dynamic';

// SCR-005 ② 열화 예측 (11.4.2)
export default async function ForecastPage({ params, searchParams }: {
  params: Promise<{ vesselId: string }>; searchParams: Promise<{ sort?: string; member?: string }>;
}) {
  const { vesselId } = await params;
  const { sort, member } = await searchParams;
  const { user, vessel } = await loadVesselPage(vesselId, '/forecast');
  const modelParams = currentModelParams();
  const rows: ForecastRow[] = forecastVessel(vessel.vesselId, modelParams).map((f) => ({
    memberId: f.memberId, name: f.name, zone: f.zone, t0: f.originalThicknessMm, lastMm: f.lastThicknessMm,
    lastDate: f.lastSurveyDate, renewal: f.renewalThicknessMm, rate: f.rate, factor: f.factor,
    renewalYear: f.renewalYear, insufficient: f.insufficient, lastYear: f.raw.lastYear,
    points: f.measurements.map((m) => ({ year: decimalYear(m.surveyDate), mm: m.thicknessMm })),
  }));
  const base = `/vessels/${vessel.vesselId}`;
  return (
    <AppShell user={user} subNav={<VesselSubNav vesselId={vessel.vesselId} name={vessel.name} active="/forecast" pending={vessel.pending} />}>
      <section className="product-tile-light"><h1>② 열화 예측</h1></section>
      {vessel.pending > 0 && (
        <div className="inline-alert warning" role="status" data-testid="SCR-005-EL-01">
          미검토 AI 판독 {vessel.pending}건은 예측에 반영되지 않았습니다.{' '}
          <Link href={`${base}/review`} data-testid="SCR-005-EL-02">판독하러 가기</Link>
        </div>
      )}
      <ForecastView rows={rows} defaultRate={modelParams.defaultCorrosionRateMmPerYear} chartEnd={decimalYear(asOf()) + 5}
        initialSort={sort === 'member' ? 'member' : 'renewal'} initialMember={member ?? null} />
      <p><Link href={`${base}/simulate`} className="button-primary" data-testid="SCR-005-EL-08">시나리오 시뮬레이션으로</Link></p>
    </AppShell>
  );
}
