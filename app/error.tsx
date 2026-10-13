'use client';

export default function ErrorPage() {
  return (
    <main>
      <div className="inline-alert error" role="alert" data-testid="ERROR-PAGE">일시적인 오류입니다. 잠시 후 다시 시도하세요.</div>
    </main>
  );
}
