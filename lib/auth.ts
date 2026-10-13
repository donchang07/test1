import 'server-only';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';

export const SESSION_COOKIE = 'rbi_session';
const SESSION_HOURS = 8;

export type Role = 'inspector' | 'admin';
export type User = { userId: string; email: string; displayName: string; role: Role };
export type SessionState =
  | { state: 'anonymous' }
  | { state: 'expired' }
  | { state: 'ok'; user: User; tokenHash: string };

export const ROLE_LABELS: Record<Role, string> = { inspector: '검사원', admin: '관리자' };

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** 이메일·비밀번호가 맞으면 세션 토큰을 만든다. 실패 사유는 구분하지 않는다(FR-002). */
export function createSession(email: string, password: string): { token: string; expiresAt: Date } | null {
  const row = db().prepare('SELECT user_id, password_hash FROM users WHERE email = ?')
    .get(email.trim().toLowerCase()) as { user_id: string; password_hash: string } | undefined;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) return null;
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 3600_000);
  db().prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(hashToken(token), row.user_id, now.toISOString(), expiresAt.toISOString());
  return { token, expiresAt };
}

export function deleteSession(token: string) {
  db().prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function expireSession(tokenHash: string) {
  db().prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
    .run(new Date(0).toISOString(), tokenHash);
}

export async function currentSession(): Promise<SessionState> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { state: 'anonymous' };
  const row = db().prepare(`SELECT s.token_hash, s.expires_at, u.user_id, u.email, u.display_name, u.role
    FROM sessions s JOIN users u ON u.user_id = s.user_id WHERE s.token_hash = ?`).get(hashToken(token)) as
    | { token_hash: string; expires_at: string; user_id: string; email: string; display_name: string; role: Role }
    | undefined;
  if (!row || new Date(row.expires_at) <= new Date()) return { state: 'expired' };
  return {
    state: 'ok',
    tokenHash: row.token_hash,
    user: { userId: row.user_id, email: row.email, displayName: row.display_name, role: row.role },
  };
}

/** 화면 보호(5.4): 미인증 → 로그인(next), 만료 → 로그인(reason=expired), 권한 없음 → /forbidden */
export async function requireUser(path: string, options: { admin?: boolean } = {}): Promise<User> {
  const session = await currentSession();
  if (session.state === 'anonymous') redirect(`/login?next=${encodeURIComponent(path)}`);
  if (session.state === 'expired') redirect('/login?reason=expired');
  if (options.admin && session.user.role !== 'admin') redirect('/forbidden');
  return session.user;
}

/** API 보호: 실패 시 Response를 돌려준다. */
export async function apiUser(options: { admin?: boolean } = {}): Promise<User | Response> {
  const session = await currentSession();
  if (session.state !== 'ok') return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (options.admin && session.user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });
  return session.user;
}

export function writeAudit(actor: string, action: string, target: string, before: unknown, after: unknown) {
  db().prepare('INSERT INTO audit_log (audit_id, actor, action, target, before, after, at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(randomBytes(8).toString('hex'), actor, action, target, JSON.stringify(before), JSON.stringify(after), new Date().toISOString());
}

export const testModeEnabled = () => process.env.APP_TEST_MODE === '1';

/** 내부 경로만 허용한다(오픈 리다이렉트 방지). */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/fleet';
}
