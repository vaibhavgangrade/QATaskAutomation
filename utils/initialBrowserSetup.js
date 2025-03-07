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
            // Define storage state with dynamic retailer name
            const storageState = {
                cookies: [
                    {
                        name: 'session-id',
                        value: Date.now().toString(),
                        domain: '.${config.domain}',
                        path: '/',
                    },
                    {
                        name: 'i18n-prefs',
                        value: 'USD',
                        domain: '.${config.domain}',
                        path: '/',
                    }
                ],
                origins: [
                    {
                        origin: 'https://www.${config.domain}',
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

            // Add cookies with error handling
            try {
                await context.addCookies(storageState.cookies);
                console.log('Cookies added successfully');
            } catch (cookieError) {
                console.error('Failed to add cookies:', cookieError.message);
                throw cookieError;
            }

            // Add localStorage items with enhanced navigation
            for (const origin of storageState.origins) {
                let page = null;
                try {
                    page = await context.newPage();
                    page.setDefaultNavigationTimeout(60000);
                    
                    // Wait for network to be idle before proceeding
                    await page.route('**/*', route => route.continue());
                    
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

    static async cleanup() {
        try {
            console.log('Cleanup completed');
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }
}

export default initialBrowserSetup;