import StepPlaceholder from '@/components/StepPlaceholder';
import { loadVesselPage } from '@/lib/vessel-page';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ vesselId: string }> }) {
  const { vesselId } = await params;
  const { user, vessel } = await loadVesselPage(vesselId, '/simulate');
  return <StepPlaceholder user={user} vessel={vessel} active="/simulate" title="③ 시나리오 시뮬레이션" feature="risk-simulation" />;
}
