import { apiUser } from '@/lib/auth';
import { HORIZONS, type Route } from '@/lib/model';
import { vessel } from '@/lib/queries';
import { runSimulation } from '@/lib/simulation';

// FR-024: 조건(1·3·5년 × 온화·보통·황천)으로 서버에서 계산하고 파라미터 스냅샷과 함께 저장
export async function POST(request: Request, { params }: { params: Promise<{ vesselId: string }> }) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { vesselId } = await params;
  if (!vessel(vesselId)) return Response.json({ error: 'not_found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const horizon = Number(body?.horizonYears);
  const route = body?.route as Route;
  if (!(HORIZONS as readonly number[]).includes(horizon) || !['calm', 'moderate', 'harsh'].includes(route)) {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }
  return Response.json({ run: runSimulation(vesselId, horizon, route, user.userId) });
}
