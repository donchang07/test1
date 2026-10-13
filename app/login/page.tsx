import { redirect } from 'next/navigation';
import Footer from '@/components/Footer';
import { currentSession, safeNext } from '@/lib/auth';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

// SCR-001 로그인
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const { next, reason } = await searchParams;
  const session = await currentSession();
  if (session.state === 'ok') redirect(safeNext(next));
  return (
    <>
      <main className="product-tile-parchment" style={{ margin: 0, maxWidth: 'none' }}>
        <div className="login-wrap">
          <div className="store-utility-card login-card">
            <h1 data-testid="SCR-001-EL-01">KR Smart RBI</h1>
            {reason === 'expired' && (
              <div className="inline-alert" role="status" data-testid="SCR-001-EL-06">세션이 만료되었습니다. 다시 로그인하세요.</div>
            )}
            <LoginForm next={next ?? ''} />
            <p className="caption" data-testid="SCR-001-EL-07">모든 데이터는 합성 데이터이며 실제 선박·선급 기록이 아닙니다.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
