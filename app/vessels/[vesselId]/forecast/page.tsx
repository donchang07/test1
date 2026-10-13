import StepPlaceholder from '@/components/StepPlaceholder';
import { loadVesselPage } from '@/lib/vessel-page';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ vesselId: string }> }) {
  const { vesselId } = await params;
  const { user, vessel } = await loadVesselPage(vesselId, '/forecast');
  return <StepPlaceholder user={user} vessel={vessel} active="/forecast" title="② 열화 예측" feature="degradation-forecast" />;
}
