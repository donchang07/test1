'use client';

import Footer from '@/components/Footer';

// 공통 오류 페이지(ERROR-PAGE). NFR-09: 모든 화면 footer에 합성 데이터 고지
export default function ErrorPage() {
  return (
    <>
      <main>
        <div className="inline-alert error" role="alert" data-testid="ERROR-PAGE">일시적인 오류입니다. 잠시 후 다시 시도하세요.</div>
      </main>
      <Footer />
    </>
  );
}
