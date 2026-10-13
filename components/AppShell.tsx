import type { ReactNode } from 'react';
import { ROLE_LABELS, type User } from '@/lib/auth';
import GlobalNav from './GlobalNav';
import Footer from './Footer';

// 로그인 후 화면 공통 틀: global-nav → (선택) sub-nav → 본문 → footer
export default function AppShell({ user, subNav, children }: { user: User; subNav?: ReactNode; children: ReactNode }) {
  return (
    <>
      <GlobalNav displayName={user.displayName} roleLabel={ROLE_LABELS[user.role]} isAdmin={user.role === 'admin'} />
      {subNav}
      <main>{children}</main>
      <Footer />
    </>
  );
}
