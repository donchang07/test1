import Link from 'next/link';
import Footer from '@/components/Footer';

// SCR-003-EL-08: 없는 선박 (HTTP 404)
export default function VesselNotFound() {
  return (
    <>
      <main>
        <div className="inline-alert error" role="alert" data-testid="SCR-003-EL-08">
          선박을 찾을 수 없습니다.{' '}
          <Link href="/fleet" data-testid="SCR-003-EL-08-back">선대 현황으로</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
