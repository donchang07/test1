import { apiUser, writeAudit } from '@/lib/auth';
import { resetAll } from '@/lib/db';

// FR-009: 관리자만. 사용자·세션은 유지하고 업무 데이터만 시드로 되돌린다.
export async function POST() {
  const user = await apiUser({ admin: true, target: 'POST /api/admin/reset' });
  if (user instanceof Response) return user;
  resetAll({ users: false });
  writeAudit(user.userId, 'data.reset', 'all', {}, { seed: true });
  return Response.json({ ok: true });
}
