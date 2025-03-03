// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

const config = {
  testDir: './tests',
  retries: 0,
  workers: process.env.CI ? 1 : undefined, // Use max workers locally, 1 in CI
  fullyParallel: true,  // Enable parallel execution
  
  /* Maximum time one test can run for. */
  timeout: 3 * 60 * 1000,
  expect: {
    timeout: 5000
  },
  
  reporter: [
    ['html', { open: 'always' }]  // 'always' will open report after each test run
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    browserName: 'chromium',
    headless: false,
    screenshot: 'on',
    trace: 'on', //off,on
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1480, height: 1050 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    
    // Additional launch arguments
    launchOptions: {
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            '--disable-features=BlockInsecurePrivateNetworkRequests',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--no-first-run',
            '--no-service-autorun',
            '--password-store=basic',
            '--use-mock-keychain',
        ]
    }
  },
};

module.exports = config;