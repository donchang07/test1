import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// SCR-009 접근 거부 (HTTP 상태는 리다이렉트 대상 화면이라 200, 의미는 403)
export default async function ForbiddenPage() {
  const user = await requireUser('/forbidden');
  return (
    <AppShell user={user}>
      <section className="product-tile-parchment" style={{ textAlign: 'center' }}>
        <h1 data-testid="SCR-009-EL-01">이 화면에 접근할 권한이 없습니다.</h1>
        <p><Link href="/fleet" className="button-primary" data-testid="SCR-009-EL-02">선대 현황으로</Link></p>
      </section>
    </AppShell>
  );
}
