import StepPlaceholder from '@/components/StepPlaceholder';
import { loadVesselPage } from '@/lib/vessel-page';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ vesselId: string }> }) {
  const { vesselId } = await params;
  const { user, vessel } = await loadVesselPage(vesselId, '/plan');
  return <StepPlaceholder user={user} vessel={vessel} active="/plan" title="④ 검사 계획" feature="inspection-plan" />;
}
