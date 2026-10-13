'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

// SCR-002-EL-10~12: 관리자 합성 데이터 초기화
export default function AdminReset() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // modal-sheet(PRD 9.3): 열리면 취소 버튼에 포커스(파괴적 동작은 기본 선택하지 않음), 닫히면 EL-10으로 되돌린다.
  function close() {
    setOpen(false);
    setError(false);
    trigger.current?.focus();
  }

  // 포커스 트랩과 Esc 닫기
  function onSheetKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!busy) close();
      return;
    }
    if (e.key !== 'Tab' || !sheet.current) return;
    const items = [...sheet.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
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

  async function confirm() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (!res.ok) throw new Error(String(res.status));
      close();
      setToast(true);
      router.refresh();
    } catch {
      setError(true);
    }
    setBusy(false);
  }

  return (
    <>
      <button ref={trigger} type="button" className="button-secondary-pill" data-testid="SCR-002-EL-10" onClick={() => setOpen(true)}>
        합성 데이터 초기화
      </button>
      {open && (
        <div className="modal-backdrop">
          <div ref={sheet} className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="reset-title" data-testid="SCR-002-EL-11" onKeyDown={onSheetKeyDown}>
            <h2 id="reset-title">합성 데이터를 초기화할까요?</h2>
            <p>판독·시뮬레이션·계획·설정이 시드 상태로 돌아갑니다.</p>
            {error && (
              <div className="inline-alert error" role="alert" data-testid="SCR-002-EL-11-error">초기화하지 못했습니다. 다시 시도하세요.</div>
            )}
            <div className="actions">
              <button type="button" className="button-secondary-pill" data-testid="SCR-002-EL-11-cancel" onClick={close} disabled={busy} autoFocus>취소</button>
              <button type="button" className="button-primary" data-testid="SCR-002-EL-11-confirm" disabled={busy} onClick={confirm}>초기화</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status" data-testid="SCR-002-EL-12">합성 데이터를 초기화했습니다.</div>}
    </>
  );
}
