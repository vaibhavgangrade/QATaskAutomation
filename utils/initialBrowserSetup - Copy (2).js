import dotenv from 'dotenv';
dotenv.config();

class initialBrowserSetup {
    static async setupBrowser(context) {
        try {
            // Define storage state with dynamic retailer name
            const storageState = {
                cookies: [
                    {
                        name: 'session-id',
                        value: Date.now().toString(),
                        domain: '.' + process.env.retname + '.com',
                        path: '/',
                    },
                    {
                        name: 'i18n-prefs',
                        value: 'USD',
                        domain: '.' + process.env.retname + '.com',
                        path: '/',
                    },
                ],
                origins: [
                    {
                        origin: 'https://www.' + process.env.retname + '.com',
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
                    
                    // Configure navigation timeout
                    page.setDefaultNavigationTimeout(60000);
                    
                    // Navigate with better error handling
                    await Promise.race([
                        page.goto(origin.origin, {
                            waitUntil: 'domcontentloaded',
                            timeout: 60000
                        }),
                        page.waitForLoadState('domcontentloaded', { 
                            timeout: 60000 
                        })
                    ]);

                    // Add localStorage items
                    for (const item of origin.localStorage) {
                        await page.evaluate(([key, value]) => {
                            try {
                                localStorage.setItem(key, value);
                                console.log(`LocalStorage item set: ${key}`);
                            } catch (e) {
                                console.warn(`Failed to set localStorage item: ${key}`, e);
                            }
                        }, [item.name, item.value]);
                    }

                    console.log(`Setup completed for origin: ${origin.origin}`);
                } catch (error) {
                    console.error(`Failed to setup origin ${origin.origin}:`, error.message);
                } finally {
                    // Ensure page is closed even if there's an error
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
}

module.exports = initialBrowserSetup;