import { testModeEnabled } from '@/lib/auth';
import { resetAll } from '@/lib/db';

// FR-010: APP_TEST_MODE=1일 때만. 업무 데이터 시드 복원 + 시드 계정 비밀번호 재설정
export async function POST() {
  if (!testModeEnabled()) return new Response('Not Found', { status: 404 });
  resetAll({ users: true });
  return Response.json({ ok: true });
}
