'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ModalSheet from '@/components/ModalSheet';
import Toast from '@/components/Toast';

type Decision = 'pending' | 'confirmed' | 'rejected';
type Label = 'corrosion' | 'crack' | 'coating_breakdown' | 'none';
type Filter = Decision | 'all';
export type Card = {
  findingId: string; imageId: string; imagePath: string; memberId: string; memberName: string;
  aiStatus: 'completed' | 'failed'; aiLabel: Label | null; aiSeverity: number | null; aiConfidence: number | null;
  humanDecision: Decision; humanLabel: Label | null; humanSeverity: number | null; version: number;
};

const LABEL_TEXT: Record<Label, string> = { corrosion: '부식', crack: '균열', coating_breakdown: '도장 손상', none: '결함 아님' };
const STATUS_TEXT: Record<Decision, string> = { pending: '미검토', confirmed: '확정', rejected: '기각' };
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'pending', label: '미검토' }, { key: 'confirmed', label: '확정' }, { key: 'rejected', label: '기각' }, { key: 'all', label: '전체' },
];
const SAVE_ERROR = '저장하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.';
const CONFLICT = '다른 사용자가 이미 판정했습니다. 화면을 새로 고칩니다.';

const visibleIds = (cards: Card[], filter: Filter) =>
  cards.filter((c) => filter === 'all' || c.humanDecision === filter).map((c) => c.findingId);

// SCR-004 ① 검사 판독: EL-01~20
export default function ReviewBoard({ vesselId, vesselName, asOfDate, hasImages, initial }: {
  vesselId: string; vesselName: string; asOfDate: string; hasImages: boolean; initial: Card[];
}) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [filter, setFilter] = useState<Filter>('pending');
  // 결정 후에도 칩을 바꾸기 전까지 카드 위치를 유지한다
  const [shown, setShown] = useState(() => visibleIds(initial, 'pending'));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(0);
  const [editing, setEditing] = useState<Card | null>(null);
  const [report, setReport] = useState<string | null>(null);

  const count = (d: Decision) => cards.filter((c) => c.humanDecision === d).length;
  const byId = new Map(cards.map((c) => [c.findingId, c]));

  function chooseFilter(next: Filter) {
    setFilter(next);
    setShown(visibleIds(cards, next));
  }

  async function save(card: Card, body: Record<string, unknown>): Promise<boolean> {
    setBusy(card.findingId);
    setError(null);
    try {
      const res = await fetch(`/api/findings/${encodeURIComponent(card.findingId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, version: card.version }),
      });
      if (res.status === 409) {
        setError(CONFLICT);
        router.refresh();
        setTimeout(() => window.location.reload(), 1500);
        return false;
      }
      if (!res.ok) throw new Error(String(res.status));
      const { card: updated } = (await res.json()) as { card: Card };
      setCards((list) => list.map((c) => (c.findingId === updated.findingId ? updated : c)));
      setToast((n) => n + 1);
      router.refresh();
      return true;
    } catch {
      setError(SAVE_ERROR);
      return false;
    } finally {
      setBusy(null);
    }
  }

  function makeReport() {
    const confirmed = cards.filter((c) => c.humanDecision === 'confirmed' && c.humanLabel);
    const lines = [
      `[합성] ${vesselName}(${vesselId}) 판독 보고서 초안 — 기준일 ${asOfDate}`,
      ...confirmed.map((c) => `- ${c.memberName}: ${LABEL_TEXT[c.humanLabel!]}${c.humanSeverity ? ` 심각도 ${c.humanSeverity}` : ''} (이미지 ${c.imageId})`),
      `미검토 ${count('pending')}건은 포함되지 않았습니다.`,
    ];
    setReport(lines.join('\n'));
  }

  if (!hasImages) {
    return (
      <>
        <div className="inline-alert" role="status" data-testid="SCR-004-EL-14">등록된 검사 이미지가 없습니다.</div>
        <Link href={`/vessels/${vesselId}/forecast`} className="button-primary" data-testid="SCR-004-EL-19">열화 예측 보기</Link>
      </>
    );
  }

  return (
    <>
      {cards.length > 0 && (
        <p className="body-strong" data-testid="SCR-004-EL-01">
          전체 {cards.length}건 · 미검토 {count('pending')}건 · 확정 {count('confirmed')}건 · 기각 {count('rejected')}건
        </p>
      )}
      <div className="toolbar">
        <div className="chip-group" role="group" aria-label="판정 상태">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className="configurator-option-chip" aria-pressed={filter === f.key}
              data-testid={`SCR-004-EL-02-${f.key}`} onClick={() => chooseFilter(f.key)}>{f.label}</button>
          ))}
        </div>
        <span className="spacer" />
        <button type="button" className="button-secondary-pill" data-testid="SCR-004-EL-16" disabled={count('confirmed') === 0} onClick={makeReport}>
          보고서 초안 만들기
        </button>
      </div>

      {error && <div className="inline-alert error" role="alert" data-testid="SCR-004-EL-18">{error}</div>}

      {shown.length === 0 ? (
        <div className="inline-alert" role="status" data-testid="SCR-004-EL-20">이 조건에 해당하는 판독이 없습니다.</div>
      ) : (
        <div className="card-grid">
          {shown.map((id) => byId.get(id)!).map((c) => (
            <FindingCardView key={c.findingId} card={c} busy={busy === c.findingId}
              onConfirm={() => save(c, { action: 'confirm' })}
              onReject={() => save(c, { action: 'reject' })}
              onRevert={() => save(c, { action: 'revert' })}
              onEdit={() => setEditing(c)} />
          ))}
        </div>
      )}

      {report && (
        <section className="store-utility-card report" data-testid="SCR-004-EL-17">
          <h2>판독 보고서 초안(합성)</h2>
          <pre>{report}</pre>
        </section>
      )}

      <p><Link href={`/vessels/${vesselId}/forecast`} className="button-primary" data-testid="SCR-004-EL-19">열화 예측 보기</Link></p>

      {editing && (
        <ReviseSheet card={editing} busy={busy === editing.findingId} onClose={() => setEditing(null)}
          onSave={async (label, severity) => {
            const ok = await save(editing, { action: 'revise', label, severity });
            if (ok) setEditing(null);
          }} />
      )}
      {toast > 0 && <Toast key={toast} testid="SCR-004-EL-15" message="판독 결과를 저장했습니다." onDone={() => setToast(0)} />}
    </>
  );
}

function FindingCardView({ card: c, busy, onConfirm, onReject, onRevert, onEdit }: {
  card: Card; busy: boolean; onConfirm: () => void; onReject: () => void; onRevert: () => void; onEdit: () => void;
}) {
  const id = `SCR-004-EL-03-${c.findingId}`;
  const pending = c.humanDecision === 'pending';
  const aiOk = c.aiStatus === 'completed';
  const badge = c.humanDecision === 'confirmed' ? 'low' : c.humanDecision === 'rejected' ? 'neutral' : 'medium';
  return (
    <article className="store-utility-card finding-card" data-testid={id}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.imagePath} alt={`${c.imageId} 합성 검사 이미지`} width={320} height={220} />
      <div className="finding-head">
        <strong>{c.memberName}</strong>
        <span className={`status-badge ${badge}`} data-testid={`${id}-status`}>{STATUS_TEXT[c.humanDecision]}</span>
      </div>
      {aiOk && c.aiLabel && (
        <p className="caption" data-testid={`${id}-ai`}>
          AI: {LABEL_TEXT[c.aiLabel]}{c.aiSeverity ? ` · 심각도 ${c.aiSeverity}` : ''} · 신뢰도 {Math.round((c.aiConfidence ?? 0) * 100)}%
        </p>
      )}
      {c.humanDecision !== 'pending' && c.humanLabel && (
        <p data-testid={`${id}-human`}>판정: {LABEL_TEXT[c.humanLabel]}{c.humanSeverity ? ` · 심각도 ${c.humanSeverity}` : ''}</p>
      )}
      {!aiOk && pending && (
        <div className="inline-alert warning" role="status" data-testid={`SCR-004-EL-13-${c.findingId}`}>AI 판독에 실패했습니다. 수동으로 판정하세요.</div>
      )}
      <div className="card-actions">
        {pending && aiOk && (
          <button type="button" className="button-pearl-capsule" data-testid={`SCR-004-EL-04-${c.findingId}`} disabled={busy} onClick={onConfirm}>확정</button>
        )}
        {pending && (
          <button type="button" className="button-pearl-capsule" data-testid={`SCR-004-EL-05-${c.findingId}`} disabled={busy} onClick={onEdit}>수정</button>
        )}
        {pending && aiOk && (
          <button type="button" className="button-pearl-capsule" data-testid={`SCR-004-EL-06-${c.findingId}`} disabled={busy} onClick={onReject}>기각</button>
        )}
        {!pending && (
          <button type="button" className="text-link" data-testid={`SCR-004-EL-12-${c.findingId}`} disabled={busy} onClick={onRevert}>검토 취소</button>
        )}
      </div>
    </article>
  );
}

function ReviseSheet({ card, busy, onClose, onSave }: {
  card: Card; busy: boolean; onClose: () => void; onSave: (label: Label, severity: number | null) => void;
}) {
  const aiOk = card.aiStatus === 'completed';
  const [label, setLabel] = useState<Label | null>(aiOk ? card.aiLabel : null);
  const [severity, setSeverity] = useState<number | null>(aiOk ? card.aiSeverity : null);
  const needsSeverity = label !== null && label !== 'none';
  const valid = label !== null && (!needsSeverity || severity !== null);
  return (
    <ModalSheet testid="SCR-004-EL-07" title="판정 수정" onClose={onClose}>
      <p className="caption">{card.memberName} · {card.imageId}</p>
      <div className="chip-group" role="group" aria-label="결함 라벨">
        {(Object.keys(LABEL_TEXT) as Label[]).map((l) => (
          <button key={l} type="button" className="configurator-option-chip" aria-pressed={label === l}
            data-testid={`SCR-004-EL-08-${l}`} onClick={() => setLabel(l)}>{LABEL_TEXT[l]}</button>
        ))}
      </div>
      {needsSeverity && (
        <div className="chip-group" role="group" aria-label="심각도">
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" className="configurator-option-chip" aria-pressed={severity === n}
              data-testid={`SCR-004-EL-09-${n}`} onClick={() => setSeverity(n)}>{n}</button>
          ))}
        </div>
      )}
      <div className="actions">
        <button type="button" className="button-secondary-pill" data-testid="SCR-004-EL-11" onClick={onClose}>취소</button>
        <button type="button" className="button-primary" data-testid="SCR-004-EL-10" disabled={!valid || busy}
          onClick={() => valid && onSave(label!, needsSeverity ? severity : null)}>저장</button>
      </div>
    </ModalSheet>
  );
}
