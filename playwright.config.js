// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    retries: 0,
    workers: 1,
    fullyParallel: false,
    timeout: 180000,
    
    expect: {
        timeout: 10000
    },

    reporter: [
        ['html', { open: 'always' }],
        ['allure-playwright', {
            detail: true,
            outputFolder: 'allure-results',
            suiteTitle: true,
            environmentInfo: {
                Framework: 'Playwright',
                Platform: process.platform,
                Browser: process.env.BROWSER || 'Chromium',
                Node: process.version,
                Environment: process.env.ENV || 'QA',
                Retailer: process.env.RETAILER,
                ExcelDir: process.env.EXCEL_DIR
            }
        }]
    ],

    use: {
        browserName: 'chromium',
        headless: false,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        viewport: { width: 1480, height: 1050 },
        actionTimeout: 30000,
        navigationTimeout: 30000,
        
        // Context options
        contextOptions: {
            acceptDownloads: true,
            bypassCSP: true
        },

        // Launch options
        launchOptions: {
            args: [
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-site-isolation-trials',
                '--disable-blink-features=AutomationControlled',
                '--enable-features=NetworkService,NetworkServiceInProcess',
                '--allow-running-insecure-content',
                '--disable-notifications',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        },

        // Storage state for cookies
        storageState: {
          cookies: [
              {
                  name: 'cookieConsent',
                  value: 'true',
                  domain: '.costco.com',
                  path: '/',
                  expires: Math.floor(Date.now() / 1000) + 3600, // Current time in seconds + 1 hour
                  httpOnly: true,
                  secure: true,
                  sameSite: 'Lax'
              }
          ],
          origins: []
      }
    },

    // Project-wide settings
    projects: [
        {
            name: 'Chromium',
            use: {
                ...devices['Desktop Chrome']
            }
        }
    ],

    // Additional configurations
    preserveOutput: 'always',
    reportSlowTests: { max: 5, threshold: 30000 },
    quiet: false,
    maxFailures: 5
});