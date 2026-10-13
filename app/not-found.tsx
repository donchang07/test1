import Link from 'next/link';
import Footer from '@/components/Footer';

// NOT-FOUND-PAGE: 정의되지 않은 경로 (HTTP 404, PRD 5.5 공통 시스템 페이지). 전역 내비 없음, footer 있음
export default function NotFound() {
  return (
    <>
      <main>
        <div className="inline-alert error" role="alert" data-testid="NOT-FOUND-PAGE">
          페이지를 찾을 수 없습니다.{' '}
          <Link href="/fleet" data-testid="NOT-FOUND-PAGE-back">선대 현황으로</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
