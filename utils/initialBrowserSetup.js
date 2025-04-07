import dotenv from 'dotenv';
import { retailerConfig } from '../config/retailers.js';
dotenv.config();

const retailer = process.env.RETAILER || 'amazon';
const config = retailerConfig[retailer];

if (!config) {
    throw new Error(`No configuration found for retailer: ${retailer}`);
}

const initialBrowserSetup = {
    async setupBrowser(context) {
        try {
            // Reduce default timeout
            context.setDefaultTimeout(20000);

            // Add dialog handling
            context.on('dialog', async (dialog) => {
                console.log('Dialog detected:', dialog.type(), dialog.message());
                await dialog.dismiss().catch(() => {});
            });

            // Handle authentication dialogs at context level
            await context.setHTTPCredentials({
                username: '',  // Empty credentials to prevent Windows auth prompt
                password: ''
            });

            // Keep the stealth script but optimize timing
            await context.addInitScript(() => {
                (() => {
                    // Advanced Fingerprint Randomization
                    const generateFingerprint = () => {
                        const fingerprint = {
                            screen: {
                                width: 1420,
                                height: 1080,
                                availWidth: 1480,
                                availHeight: 1040,
                                colorDepth: 24,
                                pixelDepth: 24
                            },
                            timezone: 'America/New_York',
                            language: 'en-US',
                            platform: 'Win32',
                            cores: 8
                        };

                        // Randomize values slightly
                        fingerprint.screen.width += Math.floor(Math.random() * 100);
                        fingerprint.screen.height += Math.floor(Math.random() * 100);
                        return fingerprint;
                    };

                    const fp = generateFingerprint();

                    // Override properties with proxy getters
                    const overrideProperty = (obj, prop, value) => {
                        Object.defineProperty(obj, prop, {
                            get: () => value,
                            enumerable: true,
                            configurable: true
                        });
                    };

                    // Screen properties
                    overrideProperty(window.screen, 'width', fp.screen.width);
                    overrideProperty(window.screen, 'height', fp.screen.height);
                    overrideProperty(window.screen, 'availWidth', fp.screen.availWidth);
                    overrideProperty(window.screen, 'availHeight', fp.screen.availHeight);
                    overrideProperty(window.screen, 'colorDepth', fp.screen.colorDepth);
                    overrideProperty(window.screen, 'pixelDepth', fp.screen.pixelDepth);

                    // Navigator properties
                    overrideProperty(navigator, 'hardwareConcurrency', fp.cores);
                    overrideProperty(navigator, 'language', fp.language);
                    overrideProperty(navigator, 'platform', fp.platform);
                    overrideProperty(navigator, 'webdriver', undefined);

                    // Hide automation
                    overrideProperty(navigator, 'plugins', {
                        length: 3,
                        item: () => null,
                        refresh: () => {},
                        namedItem: () => null,
                        [Symbol.iterator]: function* () {
                            yield { name: 'Chrome PDF Plugin' };
                            yield { name: 'Chrome PDF Viewer' };
                            yield { name: 'Native Client' };
                        }
                    });

                    // Override permissions API
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' 
                            ? Promise.resolve({ state: Notification.permission })
                            : originalQuery(parameters)
                    );

                    // Optimize natural behavior intervals
                    const addNaturalBehavior = () => {
                        // Reduce frequency of mouse movements
                        setInterval(() => {
                            if (Math.random() > 0.7) { // Only 30% chance to trigger
                                const event = new MouseEvent('mousemove', {
                                    bubbles: true,
                                    cancelable: true,
                                    clientX: Math.random() * window.innerWidth,
                                    clientY: Math.random() * window.innerHeight,
                                    screenX: Math.random() * window.screen.width,
                                    screenY: Math.random() * window.screen.height,
                                    movementX: Math.random() * 20 - 10,
                                    movementY: Math.random() * 20 - 10
                                });
                                document.dispatchEvent(event);
                            }
                        }, 2000); // Reduced from 1000-3000 to fixed 2000ms

                        // Reduce scroll frequency
                        setInterval(() => {
                            if (Math.random() > 0.8) { // Only 20% chance to trigger
                                window.scrollBy({
                                    top: (Math.random() * 100) - 50,
                                    behavior: 'smooth'
                                });
                            }
                        }, 3000); // Fixed interval
                    };

                    // Optimize load event listener
                    if (document.readyState === 'complete') {
                        setTimeout(addNaturalBehavior, 1000);
                    } else {
                        window.addEventListener('load', () => setTimeout(addNaturalBehavior, 1000));
                    }

                    // Canvas fingerprint randomization
                    const originalGetContext = HTMLCanvasElement.prototype.getContext;
                    HTMLCanvasElement.prototype.getContext = function(type) {
                        const context = originalGetContext.apply(this, arguments);
                        if (type === '2d') {
                            const originalFillText = context.fillText;
                            context.fillText = function() {
                                context.shadowColor = `rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`;
                                context.shadowBlur = Math.random() * 0.5;
                                return originalFillText.apply(this, arguments);
                            }
                        }
                        return context;
                    };

                    // Add credential handling
                    Object.defineProperty(navigator, 'credentials', {
                        value: {
                            get: () => Promise.resolve(null),
                            store: () => Promise.resolve(),
                            preventSilentAccess: () => Promise.resolve()
                        }
                    });

                    // Prevent authentication prompts
                    window.addEventListener('load', () => {
                        if (window.PasswordCredential) {
                            window.PasswordCredential = undefined;
                        }
                    });
                })();
            });

            // Keep session recovery but optimize timing
            context.on('requestfailed', async request => {
                const failure = request.failure();
                if (failure && (
                    failure.errorText.includes('blocked') ||
                    failure.errorText.includes('denied') ||
                    failure.errorText.includes('429')
                )) {
                    await this.handleSessionRecovery(context);
                }
            });

            return context;
        } catch (error) {
            console.error('Browser setup failed:', error);
            throw error;
        }
    },

    async handleSessionRecovery(context) {
        try {
            // Remove proxy rotation code
            // Only keep user agent and header rotation
            await context.setExtraHTTPHeaders({
                'User-Agent': getRandomUserAgent(),
                'Accept-Language': ['en-US', 'en-GB', 'en-CA'][Math.floor(Math.random() * 3)],
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'DNT': Math.random() > 0.5 ? '1' : '0'
            });

            // Clear storage and cookies
            await context.clearCookies();
            await context.clearPermissions();
            
            // Add random delay between 15-35 seconds
            await new Promise(r => setTimeout(r, 15000 + Math.random() * 20000));
        } catch (error) {
            console.warn('Session recovery attempt failed:', error);
        }
    },

    async prewarmSession(page) {
        try {
            // Reduce initial delay
            await page.waitForTimeout(500);

            // Optimize initial page load
            await Promise.race([
                page.goto(`https://www.${config.domain}`, {
                    waitUntil: 'domcontentloaded',
                    timeout: 20000
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Navigation timeout')), 20000))
            ]);

            // Quick security check
            await this.handleSecurityCheck(page);
            
            return page;
        } catch (error) {
            console.error('Session pre-warming failed:', error);
            throw error;
        }
    },

    async handleSecurityCheck(page) {
        try {
            // Optimize security check detection
            const hasChallenge = await Promise.race([
                page.locator('iframe[title*="challenge"]').isVisible(),
                page.locator('text=Verify you are human').isVisible(),
                page.locator('text=Just a moment...').isVisible(),
                new Promise(resolve => setTimeout(() => resolve(false), 5000))
            ]);

            if (hasChallenge) {
                console.log('Security check detected, waiting for resolution...');
                await Promise.race([
                    page.waitForSelector('.header2021-logo-img', { timeout: 20000 }),
                    page.waitForSelector('a[href*="Newegg"]', { timeout: 20000 }),
                    page.waitForNavigation({ timeout: 20000 })
                ]).catch(() => {});
            }
        } catch (error) {
            console.warn('Security check handling warning:', error);
        }
    },

    async simulateNaturalBrowsing(page) {
        try {
            // Minimal initial wait
            await page.waitForTimeout(500);

            // Optimize scrolling
            await page.evaluate(() => {
                return new Promise((resolve) => {
                    const maxScroll = Math.min(400, document.documentElement.scrollHeight - window.innerHeight);
                    if (maxScroll <= 0) {
                        resolve();
                        return;
                    }

                    window.scrollBy({
                        top: maxScroll,
                        behavior: 'smooth'
                    });

                    setTimeout(resolve, 1000);
                });
            });
        } catch (error) {
            console.warn('Natural browsing simulation warning:', error);
        }
    },

    async simulateHumanBehavior(page) {
        try {
            if (!page || page.isClosed()) return;

            // 1. Minimal initial delay
            await page.waitForTimeout(500);

            // 2. Single smooth scroll if needed
            await page.evaluate(() => {
                return new Promise((resolve) => {
                    // Only scroll if page is scrollable
                    if (document.documentElement.scrollHeight > window.innerHeight) {
                        const scrollAmount = Math.min(
                            300,  // Maximum scroll
                            (document.documentElement.scrollHeight - window.innerHeight) / 2
                        );
                        
                        window.scrollBy({
                            top: scrollAmount,
                            behavior: 'smooth'
                        });
                    }
                    setTimeout(resolve, 500);
                });
            });

            // Add natural cursor movement patterns
            await page.evaluate(() => {
                const createBezierCurve = (startX, startY, endX, endY) => {
                    const controlPoint1X = startX + (Math.random() * 100);
                    const controlPoint1Y = startY + (Math.random() * 100);
                    const controlPoint2X = endX - (Math.random() * 100);
                    const controlPoint2Y = endY - (Math.random() * 100);
                    return { controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y };
                };

                // Simulate natural mouse movement
                const moveMouseNaturally = async (startX, startY, endX, endY) => {
                    const curve = createBezierCurve(startX, startY, endX, endY);
                    const steps = 20 + Math.floor(Math.random() * 10);
                    
                    for (let i = 0; i <= steps; i++) {
                        const t = i / steps;
                        const x = Math.pow(1-t, 3) * startX + 
                                3 * Math.pow(1-t, 2) * t * curve.controlPoint1X +
                                3 * (1-t) * Math.pow(t, 2) * curve.controlPoint2X +
                                Math.pow(t, 3) * endX;
                        const y = Math.pow(1-t, 3) * startY +
                                3 * Math.pow(1-t, 2) * t * curve.controlPoint1Y +
                                3 * (1-t) * Math.pow(t, 2) * curve.controlPoint2Y +
                                Math.pow(t, 3) * endY;
                                
                        const event = new MouseEvent('mousemove', {
                            clientX: x,
                            clientY: y,
                            bubbles: true
                        });
                        document.dispatchEvent(event);
                        await new Promise(r => setTimeout(r, 10 + Math.random() * 20));
                    }
                };
            });

        } catch (error) {
            console.warn('Human behavior simulation warning:', error);
        }
    },

    async setupPage(page) {
        try {
            // Remove all resource routing/blocking
            // Keep only the WebGL fingerprinting override for anti-bot
            await page.evaluate(() => {
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    const rand = () => Math.random().toString(36).substring(7);
                    if (parameter === 37445) return `Intel ${rand()}`;
                    if (parameter === 37446) return `ANGLE (Intel, Intel(R) UHD Graphics ${rand()}, OpenGL 4.1)`;
                    return getParameter.apply(this, arguments);
                };
            });

            // Add loader detection and handling
            await page.evaluate(() => {
                window.addEventListener('load', () => {
                    const loaders = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
                    loaders.forEach(loader => {
                        if (loader) {
                            const observer = new MutationObserver((mutations) => {
                                mutations.forEach((mutation) => {
                                    if (mutation.type === 'attributes' && loader.style.display === 'none') {
                                        observer.disconnect();
                                    }
                                });
                            });
                            observer.observe(loader, { attributes: true });
                        }
                    });
                });
            });

            // Add authentication handling
            await page.route('**/*', async (route) => {
                const request = route.request();
                const headers = request.headers();

                // Skip authentication for all requests
                if (request.headerValue('www-authenticate')) {
                    headers['Authorization'] = '';  // Empty auth header
                    headers['WWW-Authenticate'] = 'None';
                }

                // Add random delays and other headers
                await new Promise(r => setTimeout(r, Math.random() * 500));
                headers['Cache-Control'] = Math.random() > 0.5 ? 'no-cache' : 'max-age=0';
                
                await route.continue({ headers });
            });

            // Add credential handling to page
            await page.evaluate(() => {
                // Disable credential prompts
                if (window.PasswordCredential) {
                    window.PasswordCredential = undefined;
                }
                
                // Prevent authentication popups
                if (window.authenticate) {
                    window.authenticate = () => Promise.resolve();
                }
            });

        } catch (error) {
            console.warn('Page setup warning:', error);
        }
    },

    // Add new method for ensuring page focus
    async ensurePageFocus(page) {
        try {
            await Promise.race([
                page.bringToFront(),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);

            await page.evaluate(() => {
                window.focus();
                document.body?.click();
            });
        } catch (error) {
            console.warn('Focus ensuring warning:', error);
        }
    },

    async cleanup(page, context) {
        try {
            if (page && !page.isClosed()) {
                await page.close().catch(() => {});
            }
            if (context) {
                await context.clearCookies().catch(() => {});
            }
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }
};

export default initialBrowserSetup;

export async function createBrowserSession(browser) {
    const viewportSizes = [
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 1536, height: 864 },
        { width: 1920, height: 1080 }
    ];
    const randomViewport = viewportSizes[Math.floor(Math.random() * viewportSizes.length)];

    const context = await browser.newContext({
        viewport: randomViewport,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        deviceScaleFactor: 1,
        hasTouch: false,
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation'],
        // Security and performance options
        ignoreHTTPSErrors: true,
        bypassCSP: true,
        javaScriptEnabled: true,
        // Additional options
        acceptDownloads: true,
        isMobile: false,
        httpCredentials: {
            username: '',  // Empty credentials to prevent Windows auth prompt
            password: ''
        },
        extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': '"Chromium";v="122", "Google Chrome";v="122"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Authorization': '',  // Empty authorization to prevent auth prompts
            'WWW-Authenticate': 'None'  // Prevent auth challenges
        }
    });

    // Add page handling for new pages
    context.on('page', async (page) => {
        // Handle dialogs on new pages
        page.on('dialog', async (dialog) => {
            await dialog.dismiss().catch(() => {});
        });
    });

    await initialBrowserSetup.setupBrowser(context);

    // Simulate realistic network conditions
    const networkConditions = [
        { latency: 20, downloadThroughput: 5 * 1024 * 1024, uploadThroughput: 1 * 1024 * 1024 },
        { latency: 40, downloadThroughput: 2 * 1024 * 1024, uploadThroughput: 512 * 1024 },
        { latency: 60, downloadThroughput: 1 * 1024 * 1024, uploadThroughput: 256 * 1024 }
    ];

    const randomNetworkCondition = networkConditions[Math.floor(Math.random() * networkConditions.length)];
    await context.route('**/*', async (route) => {
        await new Promise(r => setTimeout(r, randomNetworkCondition.latency));
        await route.continue();
    });

    return context;
}

// Optimize random delays
async function addRandomDelay() {
    const delay = 500 + Math.random() * 1000; // Reduced from 1000-3000 to 500-1500
    await new Promise(resolve => setTimeout(resolve, delay));
}