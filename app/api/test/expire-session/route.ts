import { currentSession, expireSession, testModeEnabled } from '@/lib/auth';

// FR-010: 현재 세션을 만료시켜 SC-005를 유도한다.
export async function POST() {
  if (!testModeEnabled()) return new Response('Not Found', { status: 404 });
  const session = await currentSession();
  if (session.state !== 'ok') return Response.json({ error: 'unauthorized' }, { status: 401 });
  expireSession(session.tokenHash);
  return Response.json({ ok: true });
}
