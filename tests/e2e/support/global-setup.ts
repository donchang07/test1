// E2E는 운영 Supabase 프로젝트의 업무 데이터를 시드로 되돌린다(PRD 11장·11.3).
// 실수로 실행하지 않도록 명시적 동의와 필수 변수를 먼저 확인한다.
export default function globalSetup() {
  if (process.env.E2E_ALLOW_SHARED_DB !== '1') {
    throw new Error('E2E는 운영 Supabase 데이터를 시드로 초기화합니다. 동의하면 E2E_ALLOW_SHARED_DB=1 로 다시 실행하세요.');
  }
  const missing = ['SEED_INSPECTOR_PASSWORD', 'SEED_ADMIN_PASSWORD'].filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`환경 변수가 필요합니다: ${missing.join(', ')} (.env.example 참조)`);
}
