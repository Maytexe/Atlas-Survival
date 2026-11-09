import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        'uv run --directory ../backend uvicorn app.main:app --host 127.0.0.1 --port 18000',
      url: 'http://127.0.0.1:18000/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      env: { BACKEND_PORT: '18000' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
