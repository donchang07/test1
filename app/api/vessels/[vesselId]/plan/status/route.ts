import { apiUser } from '@/lib/auth';
import { transition, type Transition } from '@/lib/plan';

// FR-031: 검토 요청(검사원·관리자), 승인·반려(관리자만, 아니면 403). 잘못된 전이는 409
export async function PUT(request: Request, { params }: { params: Promise<{ vesselId: string }> }) {
  const body = await request.json().catch(() => ({}));
  const action = body?.action as Transition;
  if (!['request', 'approve', 'reject'].includes(action)) return Response.json({ error: 'invalid_request' }, { status: 400 });
  const { vesselId } = await params;
  const user = await apiUser({ admin: action !== 'request', target: `PUT /api/vessels/${vesselId}/plan/status ${action}` });
  if (user instanceof Response) return user;
  const result = transition(vesselId, action, user.userId, typeof body?.reason === 'string' ? body.reason : undefined);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ plan: result.plan });
}
