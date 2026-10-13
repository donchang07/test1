import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// SCR-008 모델 설정 — 관리자 전용. 폼은 feature inspection-plan에서 구현한다.
export default async function SettingsPage() {
  const user = await requireUser('/admin/settings', { admin: true });
  return (
    <AppShell user={user}>
      <section className="product-tile-parchment">
        <h1>모델 설정</h1>
        <p className="placeholder">이 화면은 feature <code>inspection-plan</code>에서 구현합니다.</p>
      </section>
    </AppShell>
  );
}
