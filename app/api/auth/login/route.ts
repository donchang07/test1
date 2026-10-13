import { createSession, logLoginFailure, safeNext, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const session = email && password ? createSession(email, password) : null;
  if (!session) {
    logLoginFailure(email);
    return Response.json({ error: 'invalid_credentials' }, { status: 401 });
  }
  const response = Response.json({ next: safeNext(body.next) });
  const cookie = [
    `${SESSION_COOKIE}=${session.token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax',
    `Expires=${session.expiresAt.toUTCString()}`,
  ].join('; ');
  response.headers.append('Set-Cookie', cookie);
  return response;
}
