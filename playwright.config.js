import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 10000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx http-server . --cors -p 8080',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
      },
    },
    // Chromium can be enabled for CI environments with proper GPU support
    // {
    //   name: 'chromium',
    //   use: { 
    //     ...devices['Desktop Chrome'],
    //     launchOptions: {
    //       args: ['--enable-webgl', '--ignore-gpu-blocklist'],
    //     },
    //   },
    // },
  ],
});
