'use client';

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

// modal-sheet(PRD 9.3): 포커스 트랩, Esc 닫기, 닫으면 여는 요소로 포커스 복귀
export default function ModalSheet({ testid, title, onClose, children }: {
  testid: string; title: string; onClose: () => void; children: ReactNode;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const titleId = `${testid}-title`;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const first = sheet.current?.querySelector<HTMLElement>('button:not([disabled]), textarea, input, [href]');
    first?.focus();
    return () => opener?.focus();
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !sheet.current) return;
    const items = [...sheet.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, input, [href]')];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="modal-backdrop">
      <div ref={sheet} className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid={testid} onKeyDown={onKeyDown}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
