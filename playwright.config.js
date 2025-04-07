// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Generate random viewport dimensions
const getRandomViewport = () => ({
    width: 1920 + Math.floor(Math.random() * 100),
    height: 1080 + Math.floor(Math.random() * 100)
});

// Generate random user agent
const getRandomUserAgent = () => {
    const versions = ['112', '113', '114', '115', '116', '117', '118', '119', '120', '121', '122'];
    const randomVersion = versions[Math.floor(Math.random() * versions.length)];
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${randomVersion}.0.0.0 Safari/537.36`;
};

// Helper function to get Chrome version from user agent
const getChromeVersion = (userAgent) => {
    const match = userAgent.match(/Chrome\/(\d+)/);
    return match ? match[1] : '122';  // fallback to 122 if not found
};

module.exports = defineConfig({
    testDir: './tests',
    retries: 0,
    workers: 1,
    fullyParallel: false,
    timeout: 120000,
    
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
                Browser: 'Chromium',
                Node: process.version,
                Environment: process.env.ENV || 'QA',
                Retailer: process.env.RETAILER,
                ExcelDir: process.env.EXCEL_DIR
            }
        }]
    ],

    use: {
        // Browser settings
        browserName: 'chromium',
        headless: false,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        
        // Timeouts
        actionTimeout: 60000,
        navigationTimeout: 60000,
        
        // Context options
        acceptDownloads: true,
        bypassCSP: true,
        colorScheme: 'light',
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        javaScriptEnabled: true,
        permissions: ['geolocation', 'notifications'],
        userAgent: getRandomUserAgent(),
        
        launchOptions: {
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--enable-javascript',
                '--enable-gpu',
                '--enable-webgl',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-site-isolation-trials',
                '--enable-features=NetworkService,NetworkServiceInProcess',
                '--force-gpu-mem-available-mb=1024',
                '--ignore-certificate-errors',
                '--enable-precise-memory-info',
                '--no-default-browser-check',
                '--no-first-run',
                '--no-zygote',
                '--disable-infobars'
            ],
            ignoreDefaultArgs: [
                '--enable-automation',
                '--enable-blink-features=AutomationControlled'
            ]
        },

    //     // Update headers for Blue Nile
        // extraHTTPHeaders: {
        //     'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        //     'Accept-Language': 'en-US,en;q=0.9',
        //     'Accept-Encoding': 'gzip, deflate, br',
        //     'Connection': 'keep-alive',
        //     'Upgrade-Insecure-Requests': '1',
        //     'sec-ch-ua': `"Google Chrome";v="${getChromeVersion(getRandomUserAgent())}", "Chromium";v="${getChromeVersion(getRandomUserAgent())}", "Not=A?Brand";v="99"`,
        //     'sec-ch-ua-mobile': '?0',
        //     'sec-ch-ua-platform': '"Windows"',
        //     'sec-fetch-dest': 'document',
        //     'sec-fetch-mode': 'navigate',
        //     'sec-fetch-site': 'cross-site',
        //     'sec-fetch-user': '?1'
        // }
    },

    // Project settings
    preserveOutput: 'always',
    reportSlowTests: { max: 5, threshold: 30000 },
    quiet: false,
    maxFailures: 5
});