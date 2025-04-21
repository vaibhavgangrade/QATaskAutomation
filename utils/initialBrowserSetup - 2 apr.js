import dotenv from 'dotenv';
import { retailerConfig } from '../config/retailers.js';
dotenv.config();
const retailer = process.env.RETAILER || 'amazon';
const config = retailerConfig[retailer];

if (!config) {
    throw new Error(`No configuration found for retailer: ${retailer}`);
}

class initialBrowserSetup {
    static async setupBrowser(context) {
        try {
            // Enhanced storage state with additional cookies and headers
            const storageState = {
                cookies: [
                    {
                        name: 'session-id',
                        value: Date.now().toString(),
                        domain: `.${config.domain}`,
                        path: '/',
                    },
                    {
                        name: 'i18n-prefs',
                        value: 'USD',
                        domain: `.${config.domain}`,
                        path: '/',
                    },
                    // Add anti-bot detection cookies
                    {
                        name: 'ubid-main',
                        value: Date.now().toString(),
                        domain: `.${config.domain}`,
                        path: '/',
                    },
                    {
                        name: 'session-token',
                        value: Date.now().toString(),
                        domain: `.${config.domain}`,
                        path: '/',
                    }
                ],
                origins: [
                    {
                        origin: `https://www.${config.domain}`,
                        localStorage: [
                            {
                                name: 'session-token',
                                value: Date.now().toString(),
                            },
                            {
                                name: 'csm-hit',
                                value: Date.now().toString(),
                            }
                        ]
                    }
                ]
            };

            // Set additional browser configurations
            await context.addInitScript(() => {
                // Enhanced automation masking
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
                Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
                Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
                Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
                Object.defineProperty(navigator, 'connection', { get: () => ({ effectiveType: '4g', rtt: 50, downlink: 10 }) });
                
                // Add common browser properties
                window.chrome = {
                    runtime: {},
                    loadTimes: () => {},
                    csi: () => {},
                    app: {}
                };

                // Override permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
            });

            // Enhanced stealth mode configurations
            await context.route('**/*', async route => {
                const headers = route.request().headers();
                headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
                headers['sec-ch-ua'] = '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"';
                headers['sec-ch-ua-platform'] = '"Windows"';
                headers['sec-ch-ua-mobile'] = '?0';
                headers['accept-language'] = 'en-US,en;q=0.9';
                headers['accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
                headers['sec-fetch-site'] = 'none';
                headers['sec-fetch-mode'] = 'navigate';
                headers['sec-fetch-user'] = '?1';
                headers['sec-fetch-dest'] = 'document';
                headers['upgrade-insecure-requests'] = '1';
                headers['cache-control'] = 'max-age=0';
                
                // Add additional headers to mimic real browser
                headers['accept-encoding'] = 'gzip, deflate, br';
                headers['dnt'] = '1';
                headers['pragma'] = 'no-cache';
                
                await route.continue({ headers });
            });

            // Add random mouse movements and delays
            await context.addInitScript(() => {
                const originalFunction = document.hasFocus;
                document.hasFocus = function() { return true; };
                
                // Override WebGL
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    if (parameter === 37445) {
                        return 'Intel Open Source Technology Center';
                    }
                    if (parameter === 37446) {
                        return 'Mesa DRI Intel(R) HD Graphics (SKL GT2)';
                    }
                    return getParameter.apply(this, arguments);
                };
            });

            // Add cookies with error handling
            try {
                await context.addCookies(storageState.cookies);
                console.log('Cookies added successfully');
            } catch (cookieError) {
                console.error('Failed to add cookies:', cookieError.message);
                throw cookieError;
            }

            // Enhanced page creation with additional settings
            for (const origin of storageState.origins) {
                let page = null;
                try {
                    page = await context.newPage();
                    
                    // Set additional page properties
                    await page.setExtraHTTPHeaders({
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'max-age=0',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1'
                    });

                    // Enhanced navigation with retries
                    let navigationSuccess = false;
                    let retryCount = 0;
                    const maxRetries = 3;

                    while (!navigationSuccess && retryCount < maxRetries) {
                        try {
                            
                            // Perform navigation with both promises
                            const navigationPromise = page.goto(`https://www.${config.domain}`, {
                                waitUntil: 'domcontentloaded',
                                timeout: 60000
                            });

                            const loadStatePromise = page.waitForLoadState('domcontentloaded', { 
                                timeout: 60000 
                            });

                            await Promise.all([
                                navigationPromise,
                                loadStatePromise
                            ]);

                            // Additional wait to ensure page is stable
                            await page.waitForTimeout(1000);

                            // Verify page is actually ready
                            await page.evaluate(() => document.readyState).catch(() => 'loading');
                            
                            navigationSuccess = true;
                        } catch (navigationError) {
                            retryCount++;
                            console.warn(`Navigation attempt ${retryCount} failed:`, navigationError.message);
                            
                            // Close any dialogs that might have appeared
                            await page.keyboard.press('Escape').catch(() => {});
                            
                            if (retryCount === maxRetries) throw navigationError;
                            await page.waitForTimeout(2000 * retryCount); // Exponential backoff
                        }
                    }

                    // Set localStorage items with retry
                    for (const item of origin.localStorage) {
                        let storageSuccess = false;
                        retryCount = 0;
                        
                        while (!storageSuccess && retryCount < maxRetries) {
                            try {
                                await page.evaluate(({key, value}) => {
                                    localStorage.setItem(key, value);
                                    return true;
                                }, { key: item.name, value: item.value });
                                
                                storageSuccess = true;
                                console.log(`LocalStorage item set: ${item.name}`);
                            } catch (e) {
                                retryCount++;
                                console.warn(`Attempt ${retryCount} to set localStorage failed:`, e.message);
                                await page.waitForTimeout(1000);
                                if (retryCount === maxRetries) throw e;
                            }
                        }
                    }

                    console.log(`Setup completed for origin: ${origin.origin}`);
                } catch (error) {
                    console.error(`Failed to setup origin ${origin.origin}:`, error.message);
                    throw error;
                } finally {
                    if (page) {
                        await page.close().catch(e => 
                            console.warn('Failed to close page:', e.message)
                        );
                    }
                }
            }

            return context;
        } catch (error) {
            console.error('Browser setup failed:', error.message);
            throw error;
        }
    }

    static async cleanup(page, context) {
        try {
            console.log('Starting comprehensive cleanup process...');
            
            // Cleanup page
            if (page && !page.isClosed()) {
                try {
                    // Clear localStorage and sessionStorage
                    await page.evaluate(() => {
                        localStorage.clear();
                        sessionStorage.clear();
                        console.log('LocalStorage and SessionStorage cleared');
                    });

                    // Clear all cookies for the current domain
                    const cookies = await context.cookies();
                    if (cookies.length > 0) {
                        await context.clearCookies();
                        console.log(`Cleared ${cookies.length} cookies`);
                    }

                    // Additional delay to ensure operations are complete
                    await page.waitForTimeout(1000);
                    
                    // Close the page
                    await page.close().catch(e => console.warn('Error closing page:', e));
                    console.log('Page closed successfully');
                } catch (pageError) {
                    console.warn('Error during page cleanup:', pageError);
                }
            }

            // Cleanup context
            if (context) {
                try {
                    // Clear all cookies across all domains
                    const allCookies = await context.cookies();
                    if (allCookies.length > 0) {
                        await context.clearCookies();
                        console.log(`Cleared ${allCookies.length} cookies from context`);
                    }

                    // Clear all storage state
                    await context.clearStorageState();
                    console.log('Storage state cleared');
                } catch (contextError) {
                    console.warn('Error clearing context:', contextError);
                }
            }

            console.log('Comprehensive cleanup completed successfully');
        } catch (error) {
            console.error('Cleanup failed:', error);
            throw error;
        }
    }

}

export default initialBrowserSetup;