import { defineConfig, devices } from '@playwright/test';

// PRD NFR-04·05: Chromium, 프로덕션 빌드, APP_TEST_MODE=1, 파일 저장소를 공유하므로 workers=1.
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },
  projects: [
    {
      name: 'desktop',
      grepInvert: /@mobile/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      grep: /@mobile/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
  ],
  // E2E_BASE_URL을 주면 이미 떠 있는 서버를 쓴다.
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run start:e2e',
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { APP_TEST_MODE: '1' },
  },
});
