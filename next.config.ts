import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // better-sqlite3는 네이티브 모듈이라 번들하지 않는다.
  serverExternalPackages: ['better-sqlite3'],
  async headers() {
    // 보호 화면이 뒤로 가기로 다시 보이지 않도록(FR-005)
    return [{ source: '/((?!_next/static|_next/image|synthetic).*)', headers: [{ key: 'Cache-Control', value: 'no-store' }] }];
  },
};

export default nextConfig;
