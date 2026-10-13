import 'server-only';
import { randomBytes } from 'node:crypto';
import { db } from './db';

// SCR-004 판독(DATA-004·005) 읽기와 사람 판정 저장(FR-013~016, FR-019)

export type Decision = 'pending' | 'confirmed' | 'rejected';
export type Label = 'corrosion' | 'crack' | 'coating_breakdown' | 'none';
export const LABELS: Label[] = ['corrosion', 'crack', 'coating_breakdown', 'none'];

export type FindingCard = {
  findingId: string; imageId: string; imagePath: string; memberId: string; memberName: string;
  aiStatus: 'completed' | 'failed'; aiLabel: Label | null; aiSeverity: number | null; aiConfidence: number | null;
  humanDecision: Decision; humanLabel: Label | null; humanSeverity: number | null; humanNote: string | null; version: number;
};

type Row = Record<string, unknown>;
const toCard = (r: Row): FindingCard => ({
  findingId: r.finding_id as string,
  imageId: r.image_id as string,
  imagePath: r.image_path as string,
  memberId: r.member_id as string,
  memberName: r.member_name as string,
  aiStatus: r.ai_status as FindingCard['aiStatus'],
  aiLabel: (r.ai_label as Label | null) ?? null,
  aiSeverity: (r.ai_severity as number | null) ?? null,
  aiConfidence: (r.ai_confidence as number | null) ?? null,
  humanDecision: r.human_decision as Decision,
  humanLabel: (r.human_label as Label | null) ?? null,
  humanSeverity: (r.human_severity as number | null) ?? null,
  humanNote: (r.human_note as string | null) ?? null,
  version: r.version as number,
});

const SELECT = `SELECT f.*, i.image_path, m.name AS member_name FROM findings f
  JOIN inspection_images i ON i.image_id = f.image_id JOIN members m ON m.member_id = f.member_id`;

export function vesselFindings(vesselId: string): FindingCard[] {
  return (db().prepare(`${SELECT} WHERE f.vessel_id = ? ORDER BY f.finding_id`).all(vesselId) as Row[]).map(toCard);
}

export function imageCount(vesselId: string): number {
  return (db().prepare('SELECT COUNT(*) AS n FROM inspection_images WHERE vessel_id = ?').get(vesselId) as { n: number }).n;
}

export type DecideInput =
  | { action: 'confirm' | 'reject' | 'revert'; version: number }
  | { action: 'revise'; version: number; label: Label; severity: number | null; note?: string | null };

export type DecideResult =
  | { ok: true; card: FindingCard }
  | { ok: false; status: 400 | 404 | 409; error: string };

/** 판정 저장. version이 다르면 409(다른 사용자가 먼저 판정). AI 값은 덮어쓰지 않는다. */
export function decide(findingId: string, input: DecideInput, actor: string): DecideResult {
  const conn = db();
  return conn.transaction((): DecideResult => {
    const row = conn.prepare(`${SELECT} WHERE f.finding_id = ?`).get(findingId) as Row | undefined;
    if (!row) return { ok: false, status: 404, error: 'not_found' };
    const card = toCard(row);
    if (card.version !== input.version) return { ok: false, status: 409, error: 'conflict' };

    let next: { decision: Decision; label: Label | null; severity: number | null; note?: string | null };
    if (input.action === 'revert') {
      if (card.humanDecision === 'pending') return { ok: false, status: 409, error: 'invalid_transition' };
      next = { decision: 'pending', label: null, severity: null };
    } else {
      if (card.humanDecision !== 'pending') return { ok: false, status: 409, error: 'invalid_transition' };
      if (input.action === 'confirm') {
        if (card.aiStatus !== 'completed' || !card.aiLabel) return { ok: false, status: 400, error: 'ai_failed' };
        // FR-013: AI 라벨·심각도를 사람 판정값으로 복사해 confirmed로 저장
        next = { decision: 'confirmed', label: card.aiLabel, severity: card.aiLabel === 'none' ? null : card.aiSeverity };
      } else if (input.action === 'reject') {
        if (card.aiStatus !== 'completed') return { ok: false, status: 400, error: 'ai_failed' };
        next = { decision: 'rejected', label: null, severity: null };
      } else {
        const { label, severity, note: rawNote } = input as Extract<DecideInput, { action: 'revise' }>;
        if (!LABELS.includes(label)) return { ok: false, status: 400, error: 'invalid_label' };
        // SCR-004-EL-21: 선택, 0~200자, 공백만 있으면 null
        const note = typeof rawNote === 'string' && rawNote.trim() ? rawNote.trim() : null;
        if (note && note.length > 200) return { ok: false, status: 400, error: 'invalid_note' };
        if (label === 'none') {
          next = { decision: 'rejected', label: 'none', severity: null, note };
        } else {
          if (![1, 2, 3].includes(Number(severity))) return { ok: false, status: 400, error: 'invalid_severity' };
          next = { decision: 'confirmed', label, severity: Number(severity), note };
        }
      }
    }

    const now = new Date().toISOString();
    const reviewed = next.decision === 'pending' ? { by: null, at: null } : { by: actor, at: now };
    // 확정·기각은 메모를 비우고, 수정은 입력한 메모를, 검토 취소는 메모를 비운다
    const note = next.note ?? null;
    conn.prepare(`UPDATE findings SET human_decision = ?, human_label = ?, human_severity = ?, human_note = ?, reviewed_by = ?, reviewed_at = ?,
      version = version + 1 WHERE finding_id = ?`)
      .run(next.decision, next.label, next.severity, note, reviewed.by, reviewed.at, findingId);
    conn.prepare('INSERT INTO audit_log (audit_id, actor, action, target, before, after, at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      randomBytes(8).toString('hex'), actor, input.action === 'revert' ? 'finding.revert' : 'finding.decide', findingId,
      JSON.stringify({ humanDecision: card.humanDecision, humanLabel: card.humanLabel, humanSeverity: card.humanSeverity, humanNote: card.humanNote }),
      JSON.stringify({ humanDecision: next.decision, humanLabel: next.label, humanSeverity: next.severity, humanNote: note }), now,
    );
    return { ok: true, card: toCard(conn.prepare(`${SELECT} WHERE f.finding_id = ?`).get(findingId) as Row) };
  })();
}
