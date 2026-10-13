import { NextResponse, type NextRequest } from 'next/server';

// SCR-009는 HTTP 403으로 응답한다(PRD 5.5). 세션·권한 판정은 서버 컴포넌트가 하고(SQLite는 Edge에서 못 씀),
// 여기서는 같은 경로로 rewrite하면서 상태 코드만 바꾼다.
export function middleware(request: NextRequest) {
  return NextResponse.rewrite(request.nextUrl, { status: 403 });
}

export const config = { matcher: '/forbidden' };
