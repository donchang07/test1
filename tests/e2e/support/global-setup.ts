// E2E 시작 전에 필수 환경 변수를 확인한다(PRD 11.3). 서버는 data/e2e.db를 쓰므로 개발 DB(data/app.db)는 건드리지 않는다.
export default function globalSetup() {
  const missing = ['SEED_INSPECTOR_PASSWORD', 'SEED_ADMIN_PASSWORD'].filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`환경 변수가 필요합니다: ${missing.join(', ')} (.env.example 참조)`);
}
