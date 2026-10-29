import { defineConfig, devices } from '@playwright/test';

const SUPABASE_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
};

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
          args: ['--no-sandbox'],
        },
      },
    },
  ],
  webServer: [
    {
      command: 'node e2e/support/standin-supabase.mjs',
      url: 'http://127.0.0.1:54321/__state',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run build && npm start',
      url: 'http://127.0.0.1:3000/games',
      env: SUPABASE_ENV,
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
