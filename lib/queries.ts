import 'server-only';
import { db } from './db';

export type Grade = 'high' | 'medium' | 'low';
export type PlanStatus = 'draft' | 'review_requested' | 'approved' | 'rejected';

export const GRADE_LABELS: Record<Grade, string> = { high: '높음', medium: '중간', low: '낮음' };
export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: '초안', review_requested: '검토 요청', approved: '승인됨', rejected: '반려됨',
};

export type Vessel = {
  vesselId: string; name: string; shipType: string; builtYear: number; grossTonnage: number;
  classNotation: string; nextSpecialSurveyDue: string;
};

export type FleetRow = Vessel & {
  pending: number; imageCount: number; maxGrade: Grade | null; highCount: number;
  latestRunAt: string | null; planStatus: PlanStatus | null;
};

export function asOfDate(): string {
  return (db().prepare('SELECT as_of_date FROM app_meta WHERE id = 1').get() as { as_of_date: string }).as_of_date;
}

function maxGradeOf(counts: { high: number; medium: number; low: number } | null): Grade | null {
  if (!counts) return null;
  if (counts.high > 0) return 'high';
  if (counts.medium > 0) return 'medium';
  return 'low';
}

export function fleet(): FleetRow[] {
  const rows = db().prepare(`
    SELECT v.*,
      (SELECT COUNT(*) FROM findings f WHERE f.vessel_id = v.vessel_id AND f.human_decision = 'pending') AS pending,
      (SELECT COUNT(*) FROM inspection_images i WHERE i.vessel_id = v.vessel_id) AS image_count,
      (SELECT counts FROM simulation_runs r WHERE r.vessel_id = v.vessel_id ORDER BY r.created_at DESC, r.run_id DESC LIMIT 1) AS latest_counts,
      (SELECT created_at FROM simulation_runs r WHERE r.vessel_id = v.vessel_id ORDER BY r.created_at DESC, r.run_id DESC LIMIT 1) AS latest_run_at,
      (SELECT status FROM inspection_plans p WHERE p.vessel_id = v.vessel_id) AS plan_status
    FROM vessels v ORDER BY v.vessel_id`).all() as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const counts = r.latest_counts ? JSON.parse(r.latest_counts as string) : null;
    return {
      vesselId: r.vessel_id as string,
      name: r.name as string,
      shipType: r.ship_type as string,
      builtYear: r.built_year as number,
      grossTonnage: r.gross_tonnage as number,
      classNotation: r.class_notation as string,
      nextSpecialSurveyDue: r.next_special_survey_due as string,
      pending: r.pending as number,
      imageCount: r.image_count as number,
      maxGrade: maxGradeOf(counts),
      highCount: counts?.high ?? 0,
      latestRunAt: (r.latest_run_at as string | null) ?? null,
      planStatus: (r.plan_status as PlanStatus | null) ?? null,
    };
  });
}

export function vessel(vesselId: string): FleetRow | null {
  return fleet().find((v) => v.vesselId === vesselId) ?? null;
}

export function fleetKpis(rows: FleetRow[]) {
  return {
    vessels: rows.length,
    pending: rows.reduce((s, r) => s + r.pending, 0),
    high: rows.reduce((s, r) => s + r.highCount, 0),
    awaitingApproval: rows.filter((r) => r.planStatus === 'review_requested').length,
  };
}

/** Asia/Seoul 기준 `YYYY-MM-DD HH:mm` */
export function formatDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
  return parts.replace('T', ' ');
}
