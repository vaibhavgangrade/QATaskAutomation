// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

const config = {
  testDir: './tests',
  retries: 0,
  workers: 1, // Ensures single worker
  fullyParallel: false, // Prevents parallel execution
  
  timeout: 3 * 60 * 1000,
  expect: {
    timeout: 5000
  },
  
  reporter: [
    ['html', {
      open: 'always'  //open HTML report automatically
    }],
    ['allure-playwright', {
      detail: true,
      outputFolder: 'allure-results',
      suiteTitle: true,
      environmentInfo: {
        Framework: 'Playwright',
        Platform: process.platform,  // From Node.js - shows OS platform
        Browser: process.env.BROWSER || 'Chromium',
        Node: process.version,      // From Node.js - shows Node version
        Environment: process.env.ENV || 'QA',
        Retailer: process.env.RETAILER, // From your .env file
        ExcelDir: process.env.EXCEL_DIR // From your .env file
      },
      categories: [
        {
          name: 'Failed tests',
          messageRegex: '.*',
          matchedStatuses: ['failed']
        },
        {
          name: 'Broken tests',
          traceRegex: '.*',
          matchedStatuses: ['broken']
        },
        {
          name: 'Ignored tests',
          matchedStatuses: ['skipped']
        },
        {
          name: 'Successful tests',
          matchedStatuses: ['passed']
        }
      ],
      labels: [
        { name: 'epic', value: 'E2E Testing' },
        { name: 'feature', value: 'Retailer Automation' }
      ]
    }]
],

  use: {
    browserName: 'chromium',
    headless: false,
    screenshot: 'on',
    trace: 'on',
    video: 'on',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1480, height: 1050 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    
    // Add this to reuse browser instance
    reuseExistingBrowser: true,
    
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