'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type Props = { displayName: string; roleLabel: string; isAdmin: boolean };

// global-nav: NAV-01~06 (PRD 5.3)
export default function GlobalNav({ displayName, roleLabel, isAdmin }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const fleetActive = pathname === '/fleet' || pathname.startsWith('/vessels/');

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.assign('/login');
  }

  return (
    <header className="global-nav">
      <div className="inner">
        <Link href="/fleet" className="brand" data-testid="NAV-01">KR Smart RBI</Link>
        <button
          type="button"
          className="button-icon-circular menu-button"
          data-testid="NAV-06"
          aria-label="메뉴 열기"
          aria-expanded={open}
          aria-controls="global-nav-links"
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
        <div id="global-nav-links" className={`links${open ? ' open' : ''}`}>
          <Link href="/fleet" data-testid="NAV-02" aria-current={fleetActive ? 'page' : undefined} onClick={() => setOpen(false)}>
            선대 현황
          </Link>
          {isAdmin && (
            <Link href="/admin/settings" data-testid="NAV-03" aria-current={pathname.startsWith('/admin') ? 'page' : undefined} onClick={() => setOpen(false)}>
              모델 설정
            </Link>
          )}
          <span className="spacer" />
          <span data-testid="NAV-04">
            {displayName} · <span className="status-badge">{roleLabel}</span>
          </span>
          <button type="button" className="button-dark-utility" data-testid="NAV-05" onClick={logout}>로그아웃</button>
        </div>
      </div>
    </header>
  );
}
