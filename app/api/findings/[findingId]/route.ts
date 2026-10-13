import { apiUser } from '@/lib/auth';
import { decide, type DecideInput } from '@/lib/review';

// FR-013~016: 판정 확정·수정·기각·검토 취소. 검사원·관리자 모두 가능
export async function PUT(request: Request, { params }: { params: Promise<{ findingId: string }> }) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { findingId } = await params;
  const body = await request.json().catch(() => null) as DecideInput | null;
  if (!body || !['confirm', 'reject', 'revert', 'revise'].includes(body.action) || typeof body.version !== 'number') {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }
  const result = decide(findingId, body, user.userId);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ card: result.card });
}
