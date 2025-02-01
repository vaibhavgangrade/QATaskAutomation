// @ts-check
const { devices } = require('@playwright/test');

const config = {
  testDir: './tests',
  retries: 0,
  workers: 1,
  fullyParallel: false,
  
  /* Maximum time one test can run for. */
  timeout: 120 * 1000,
  expect: {
  
    timeout: 10000
  },
  
  reporter: [
    ['html', { open: 'always' }]  // 'always' will open report after each test run
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {

    browserName : 'chromium',
     // Launch browsers with DevTools open
    //  devtools: true,
     // Slow down execution by 1000ms
    headless : false,
    screenshot : 'on',
    trace : 'on',//off,on
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1480, height: 1050 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    
    // Additional launch arguments
    launchOptions: {
      // slowMo: 1000,
      // devtools: true,
        args: [
            // '--auto-open-devtools-for-tabs',
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
