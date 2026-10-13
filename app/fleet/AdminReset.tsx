'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// SCR-002-EL-10~12: 관리자 합성 데이터 초기화
export default function AdminReset() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function confirm() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (!res.ok) throw new Error(String(res.status));
      setOpen(false);
      setToast(true);
      router.refresh();
    } catch {
      setError(true);
    }
    setBusy(false);
  }

  return (
    <>
      <button type="button" className="button-secondary-pill" data-testid="SCR-002-EL-10" onClick={() => setOpen(true)}>
        합성 데이터 초기화
      </button>
      {open && (
        <div className="modal-backdrop" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
          <div className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="reset-title" data-testid="SCR-002-EL-11">
            <h2 id="reset-title">합성 데이터를 초기화할까요?</h2>
            <p>판독·시뮬레이션·계획·설정이 시드 상태로 돌아갑니다.</p>
            {error && (
              <div className="inline-alert error" role="alert" data-testid="SCR-002-EL-11-error">초기화하지 못했습니다. 다시 시도하세요.</div>
            )}
            <div className="actions">
              <button type="button" className="button-secondary-pill" data-testid="SCR-002-EL-11-cancel" onClick={() => setOpen(false)}>취소</button>
              <button type="button" className="button-primary" data-testid="SCR-002-EL-11-confirm" disabled={busy} onClick={confirm} autoFocus>초기화</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status" data-testid="SCR-002-EL-12">합성 데이터를 초기화했습니다.</div>}
    </>
  );
}
