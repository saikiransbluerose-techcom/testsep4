// playwright.config.js (root, ESM)
import { defineConfig } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: '.',
  testIgnore: [/node_modules/, /\.git/],
  timeout: 120_000,
  expect: { timeout: 5_000 },
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'always' }]],
  use: {
    headless: false,
    launchOptions: {
      slowMo: 1000,
      args: [
        '--disable-extensions',
        '--disable-popup-blocking',
        '--no-sandbox',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
      ],
    },
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    testIdAttribute: 'data-test-id',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'IntelligentHealthCare - Chromium', testDir: './IntelligentHealthCare/tests', use: { browserName: 'chromium' }, outputDir: 'test-results/IntelligentHealthCare/chromium' },
    { name: 'IntelligentHealthCare - Firefox',  testDir: './IntelligentHealthCare/tests', use: { browserName: 'firefox'  }, outputDir: 'test-results/IntelligentHealthCare/firefox'  },
    { name: 'IntelligentHealthCare - WebKit',   testDir: './IntelligentHealthCare/tests', use: { browserName: 'webkit'   }, outputDir: 'test-results/IntelligentHealthCare/webkit'   },
    { name: 'LoanManagement - Chromium',        testDir: './LoanManagement/tests',        use: { browserName: 'chromium' }, outputDir: 'test-results/LoanManagement/chromium' },
    { name: 'LoanManagement - Firefox',         testDir: './LoanManagement/tests',        use: { browserName: 'firefox'  }, outputDir: 'test-results/LoanManagement/firefox'  },
    { name: 'LoanManagement - WebKit',          testDir: './LoanManagement/tests',        use: { browserName: 'webkit'   }, outputDir: 'test-results/LoanManagement/webkit'   },
    { name: 'SiemensApplication - edge',        testDir: './SiemensApplication/tests',    use: { browserName: 'chromium' }, outputDir: 'test-results/SiemensApplication/edge' },
  ],
});
