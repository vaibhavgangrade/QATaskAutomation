const { defineConfig } = require('@playwright/test');

const config = {
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
        reuseExistingBrowser: true,

        launchOptions: {
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins',
                '--disable-site-isolation-trials',
                '--disable-gpu',
                '--disable-gpu-vsync',
                '--disable-frame-rate-limit',
                '--disable-gpu-compositing',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        }
    },

    serviceWorkers: 'block',
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
    bypassCSP: true
};

module.exports = config;