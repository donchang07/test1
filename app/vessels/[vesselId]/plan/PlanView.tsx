'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ModalSheet from '@/components/ModalSheet';

type Grade = 'high' | 'medium' | 'low';
type Status = 'draft' | 'review_requested' | 'approved' | 'rejected';
type Item = { memberId: string; name: string; risk: number; grade: Grade; hours: number; reason: 'mandatory' | 'efficiency' };
export type PlanData = {
  budgetHours: number; items: Item[]; excluded: Item[]; totalHours: number; coveragePct: number; mandatoryCount: number;
  port: { port: string; eta: string; dwellHours: number } | null; status: Status; rejectReason: string | null;
};

const STATUS_LABEL: Record<Status, string> = { draft: '초안', review_requested: '검토 요청', approved: '승인됨', rejected: '반려됨' };
const STATUS_BADGE: Record<Status, string> = { draft: 'neutral', review_requested: 'medium', approved: 'low', rejected: 'high' };
const GRADE_LABEL: Record<Grade, string> = { high: '높음', medium: '중간', low: '낮음' };
const SAVE_ERROR = '저장하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.';
/** PRD 5.5: 시간은 소수 최대 1자리 + `시간` */
const hours = (v: number) => `${Number.isInteger(v) ? v : (Math.round(v * 10) / 10).toFixed(1)}시간`;
const validBudget = (text: string) => /^\d+$/.test(text.trim()) && Number(text) >= 4 && Number(text) <= 200;

// SCR-007 ④ 검사 계획: EL-01~19
export default function PlanView({ vesselId, isAdmin, basis, defaultBudget, initial }: {
  vesselId: string; isAdmin: boolean; basis: string | null; defaultBudget: number; initial: PlanData | null;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initial);
  const [budget, setBudget] = useState(String(initial && initial.status !== 'approved' ? initial.budgetHours : defaultBudget));
  const [infeasible, setInfeasible] = useState<{ required: number; budget: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  if (!basis) {
    return (
      <div className="inline-alert" role="status" data-testid="SCR-007-EL-02">
        먼저 시뮬레이션을 실행하세요.{' '}
        <Link href={`/vessels/${vesselId}/simulate`} data-testid="SCR-007-EL-02-link">시뮬레이션으로</Link>
      </div>
    );
  }

  const locked = plan?.status === 'approved';
  const budgetOk = validBudget(budget);

  async function call(url: string, method: string, body: unknown): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(String(res.status));
      return await res.json();
    } catch {
      setError(true);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function runOptimize() {
    const data = await call(`/api/vessels/${encodeURIComponent(vesselId)}/plan`, 'POST', { budgetHours: Number(budget) });
    if (!data) return;
    if (data.infeasible) {
      setInfeasible({ required: data.requiredHours as number, budget: data.budgetHours as number });
    } else {
      setInfeasible(null);
      setPlan(data.plan as PlanData);
    }
    router.refresh();
  }

  async function changeStatus(action: 'request' | 'approve' | 'reject', reason?: string) {
    const data = await call(`/api/vessels/${encodeURIComponent(vesselId)}/plan/status`, 'PUT', { action, reason });
    if (!data) return false;
    setPlan(data.plan as PlanData);
    router.refresh();
    return true;
  }

  const showPlan = plan && !infeasible;

  return (
    <div className="plan">
      <p className="caption" data-testid="SCR-007-EL-01">{basis}</p>

      <div className="budget-row">
        {!locked && (
          <div className="field">
            <label htmlFor="budget">검사 시간 예산(시간)</label>
            <input id="budget" type="number" inputMode="numeric" min={4} max={200} step={1} className="text-input"
              data-testid="SCR-007-EL-03" value={budget} aria-invalid={!budgetOk}
              aria-describedby={budgetOk ? undefined : 'budget-error'} onChange={(e) => setBudget(e.target.value)} />
            {!budgetOk && <p id="budget-error" className="field-error" data-testid="SCR-007-EL-03-error">4~200 사이의 정수를 입력하세요.</p>}
          </div>
        )}
        <div className="optimize">
          <button type="button" className="button-primary" data-testid="SCR-007-EL-04" disabled={locked || !budgetOk || busy} onClick={runOptimize}>
            최적화 실행
          </button>
          {locked && <p className="caption" data-testid="SCR-007-EL-04-locked">승인된 계획은 변경할 수 없습니다.</p>}
        </div>
      </div>

      {error && <div className="inline-alert error" role="alert" data-testid="SCR-007-EL-19">{SAVE_ERROR}</div>}

      {infeasible && (
        <div className="inline-alert error" role="alert" data-testid="SCR-007-EL-05">
          필수(높음) 항목에만 {hours(infeasible.required)}이 필요해 예산 {hours(infeasible.budget)}을 초과합니다. 예산을 {hours(infeasible.required)} 이상으로 늘리세요.
        </div>
      )}

      {showPlan && (
        <>
          {plan.status === 'rejected' && plan.rejectReason && (
            <div className="inline-alert warning" role="status" data-testid="SCR-007-EL-17">반려 사유: {plan.rejectReason}</div>
          )}
          <section className="store-utility-card plan-summary" data-testid="SCR-007-EL-06">
            <span data-testid="SCR-007-EL-06-count">선택 {plan.items.length}개</span>
            <span data-testid="SCR-007-EL-06-hours">총 {hours(plan.totalHours)} / 예산 {hours(plan.budgetHours)}</span>
            <span data-testid="SCR-007-EL-06-coverage">위험 커버리지 {plan.coveragePct.toFixed(1)}%</span>
            <span data-testid="SCR-007-EL-06-mandatory">필수 {plan.mandatoryCount}개</span>
          </section>

          {plan.port ? (
            <section className="store-utility-card port" data-testid="SCR-007-EL-09">
              <strong>추천 기항지: {plan.port.port}</strong>
              <span>입항 {plan.port.eta} · 체류 {plan.port.dwellHours}시간</span>
            </section>
          ) : (
            <div className="inline-alert warning" role="status" data-testid="SCR-007-EL-10">
              조건에 맞는 기항지가 없습니다. 체류 시간이 {hours(plan.totalHours)} 이상이고 검사원 배치가 가능한 기항지가 필요합니다.
            </div>
          )}

          <div className="table-wrap">
            <table className="data-table" data-testid="SCR-007-EL-07">
              <caption className="section-title">검사 항목</caption>
              <thead>
                <tr><th scope="col">부재</th><th scope="col" className="num">위험점수</th><th scope="col">등급</th><th scope="col" className="num">소요</th><th scope="col">선정 사유</th></tr>
              </thead>
              <tbody>
                {plan.items.map((i) => <ItemRow key={i.memberId} id={`SCR-007-EL-07-${i.memberId}`} item={i} reason />)}
              </tbody>
            </table>
          </div>

          <section className="excluded" data-testid="SCR-007-EL-08">
            <button type="button" className="text-link" aria-expanded={showExcluded} aria-controls="excluded-table"
              onClick={() => setShowExcluded((v) => !v)}>제외 항목 {plan.excluded.length}개</button>
            {showExcluded && (
              <div className="table-wrap" id="excluded-table">
                <table className="data-table">
                  <thead>
                    <tr><th scope="col">부재</th><th scope="col" className="num">위험점수</th><th scope="col">등급</th><th scope="col" className="num">소요</th></tr>
                  </thead>
                  <tbody>
                    {plan.excluded.map((i) => <ItemRow key={i.memberId} id={`SCR-007-EL-08-${i.memberId}`} item={i} />)}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="floating-sticky-bar" data-testid="SCR-007-EL-11">
            <span className={`status-badge ${STATUS_BADGE[plan.status]}`} data-testid="SCR-007-EL-18">{STATUS_LABEL[plan.status]}</span>
            <span className="spacer" />
            {(plan.status === 'draft' || plan.status === 'rejected') && (
              <button type="button" className="button-primary" data-testid="SCR-007-EL-12" disabled={busy} onClick={() => changeStatus('request')}>검토 요청</button>
            )}
            {isAdmin && plan.status === 'review_requested' && (
              <>
                <button type="button" className="button-secondary-pill" data-testid="SCR-007-EL-14" disabled={busy} onClick={() => setRejecting(true)}>반려</button>
                <button type="button" className="button-primary" data-testid="SCR-007-EL-13" disabled={busy} onClick={() => changeStatus('approve')}>승인</button>
              </>
            )}
          </div>
        </>
      )}

      {rejecting && (
        <RejectSheet busy={busy} onClose={() => setRejecting(false)}
          onConfirm={async (reason) => { if (await changeStatus('reject', reason)) setRejecting(false); }} />
      )}
    </div>
  );
}

function ItemRow({ id, item: i, reason }: { id: string; item: Item; reason?: boolean }) {
  return (
    <tr data-testid={id}>
      <td data-testid={`${id}-name`}>{i.name}</td>
      <td className="num" data-testid={`${id}-risk`}>{i.risk}</td>
      <td data-testid={`${id}-grade`}><span className={`status-badge ${i.grade}`}>{GRADE_LABEL[i.grade]}</span></td>
      <td className="num" data-testid={`${id}-hours`}>{hours(i.hours)}</td>
      {reason && <td data-testid={`${id}-reason`}>{i.reason === 'mandatory' ? '필수(고위험)' : '위험 대비 효율'}</td>}
    </tr>
  );
}

function RejectSheet({ busy, onClose, onConfirm }: { busy: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const [invalid, setInvalid] = useState(false);
  return (
    <ModalSheet testid="SCR-007-EL-15" title="반려 사유" onClose={onClose}>
      <label htmlFor="reject-reason" className="sr-only">반려 사유</label>
      <textarea id="reject-reason" className="text-area" data-testid="SCR-007-EL-15-reason" maxLength={200} rows={4}
        value={reason} aria-invalid={invalid} onChange={(e) => setReason(e.target.value)} />
      {invalid && <p className="field-error" role="alert" data-testid="SCR-007-EL-15-error">반려 사유를 5자 이상 입력하세요.</p>}
      <div className="actions">
        <button type="button" className="button-icon-circular sheet-close" aria-label="닫기" data-testid="SCR-007-EL-15-close" onClick={onClose}>×</button>
        <button type="button" className="button-primary" data-testid="SCR-007-EL-16" disabled={busy}
          onClick={() => {
            const text = reason.trim();
            if (text.length < 5 || text.length > 200) { setInvalid(true); return; }
            setInvalid(false);
            onConfirm(text);
          }}>반려 확정</button>
      </div>
    </ModalSheet>
  );
}
