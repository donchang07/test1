import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import 'pretendard/dist/web/static/pretendard.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'KR Smart RBI',
  description: '선체 구조 건전성 기반 위험도 기반 검사 (합성 데이터)',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
