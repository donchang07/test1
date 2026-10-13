import 'server-only';
import { notFound } from 'next/navigation';
import { requireUser } from './auth';
import { vessel } from './queries';

/** 선박 화면 공통: 로그인 확인 → 선박 조회(없으면 404, SCR-003-EL-08) */
export async function loadVesselPage(vesselId: string, subPath: string) {
  const user = await requireUser(`/vessels/${vesselId}${subPath}`);
  const v = vessel(vesselId);
  if (!v) notFound();
  return { user, vessel: v };
}
