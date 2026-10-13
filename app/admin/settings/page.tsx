import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';
import { currentParams, paramsHistory } from '@/lib/settings';
import SettingsForm from './SettingsForm';

export const dynamic = 'force-dynamic';

// SCR-008 모델 설정 — 관리자 전용(검사원 → SCR-009). REF-04 단일 열 폼 + 하단 이력 표
export default async function SettingsPage() {
  const user = await requireUser('/admin/settings', { admin: true });
  return (
    <AppShell user={user}>
      <section className="product-tile-light">
        <h1>모델 설정</h1>
      </section>
      <div className="settings-wrap">
        <SettingsForm initial={currentParams()} history={paramsHistory()} />
      </div>
    </AppShell>
  );
}
