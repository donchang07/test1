import AppShell from '@/components/AppShell';
import VesselSubNav from '@/components/VesselSubNav';
import type { User } from '@/lib/auth';
import type { FleetRow } from '@/lib/queries';

// 뼈대 단계의 자리표시 화면. 해당 feature를 bkit으로 구현할 때 교체한다.
export default function StepPlaceholder({ user, vessel, active, title, feature }: {
  user: User; vessel: FleetRow; active: '/review' | '/forecast' | '/simulate' | '/plan'; title: string; feature: string;
}) {
  return (
    <AppShell user={user} subNav={<VesselSubNav vesselId={vessel.vesselId} name={vessel.name} active={active} pending={vessel.pending} />}>
      <section className="product-tile-parchment">
        <h1>{title}</h1>
        <p className="placeholder">이 화면은 feature <code>{feature}</code>에서 구현합니다(<code>/pdca plan {feature}</code>).</p>
      </section>
    </AppShell>
  );
}
