import StepPlaceholder from '@/components/StepPlaceholder';
import { loadVesselPage } from '@/lib/vessel-page';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ vesselId: string }> }) {
  const { vesselId } = await params;
  const { user, vessel } = await loadVesselPage(vesselId, '/review');
  return <StepPlaceholder user={user} vessel={vessel} active="/review" title="① 검사 판독" feature="inspection-review" />;
}
