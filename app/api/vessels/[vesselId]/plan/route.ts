import { apiUser } from '@/lib/auth';
import { optimizeAndSave } from '@/lib/plan';
import { vessel } from '@/lib/queries';

// FR-028·029·034: 최신 시뮬레이션과 예산(정수 4~200)으로 최적화. infeasible이면 저장하지 않는다.
export async function POST(request: Request, { params }: { params: Promise<{ vesselId: string }> }) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { vesselId } = await params;
  if (!vessel(vesselId)) return Response.json({ error: 'not_found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const budget = Number(body?.budgetHours);
  if (!Number.isInteger(budget) || budget < 4 || budget > 200) return Response.json({ error: 'invalid_budget' }, { status: 400 });
  const result = optimizeAndSave(vesselId, budget);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result);
}
