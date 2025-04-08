// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Generate random viewport dimensions
const getRandomViewport = () => ({
    width: 1480 + Math.floor(Math.random() * 100),
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
    retries: 1,
    workers: 1,
    fullyParallel: false,
    timeout: 120000,
    
    expect: {
        timeout: 10000
    },

    reporter: [
        ['html', { 
            open: 'always',
            // Add template option to include custom stats section in HTML report
            template: {
                head: '<style> .step-stats { background-color: #f5f5f5; padding: 10px; margin-top: 10px; border-radius: 5px; } .step-stats h3 { margin-top: 0; } .step-stats-table { width: 100%; border-collapse: collapse; } .step-stats-table th, .step-stats-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; } </style>'
            }
        }],
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
        }],
        ['list', { printSteps: true }] // Add list reporter to show steps in console
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
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
        permissions: ['geolocation', 'notifications'],
        
        // Advanced antibot options
        extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Sec-CH-UA': '"Chromium";v="122", "Google Chrome";v="122"',
            'Sec-CH-UA-Mobile': '?0',
            'Sec-CH-UA-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
        },

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
                '--disable-infobars',
                '--cipher-suite-blacklist=0x0088,0x0087,0x0039,0x0038',
                '--tls-version-min=tls1.2',
                '--window-position=0,0',
                '--user-agent-client-hints'
            ],
            ignoreDefaultArgs: [
                '--enable-automation',
                '--enable-blink-features=AutomationControlled'
            ]
        }
    },

    // Project settings
    preserveOutput: 'always',
    reportSlowTests: { max: 5, threshold: 30000 },
    quiet: false,
    maxFailures: 5
});