import AppShell from '@/components/AppShell';
import VesselSubNav from '@/components/VesselSubNav';
import { asOfDate } from '@/lib/queries';
import { imageCount, vesselFindings } from '@/lib/review';
import { loadVesselPage } from '@/lib/vessel-page';
import ReviewBoard from './ReviewBoard';

export const dynamic = 'force-dynamic';

// SCR-004 ① 검사 판독
export default async function ReviewPage({ params }: { params: Promise<{ vesselId: string }> }) {
  const { vesselId } = await params;
  const { user, vessel } = await loadVesselPage(vesselId, '/review');
  return (
    <AppShell user={user} subNav={<VesselSubNav vesselId={vessel.vesselId} name={vessel.name} active="/review" pending={vessel.pending} />}>
      <section className="product-tile-light"><h1>① 검사 판독</h1></section>
      <ReviewBoard vesselId={vessel.vesselId} vesselName={vessel.name} asOfDate={asOfDate()}
        hasImages={imageCount(vessel.vesselId) > 0} initial={vesselFindings(vessel.vesselId)} />
    </AppShell>
  );
}
