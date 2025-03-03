import dotenv from 'dotenv';
dotenv.config();

class initialBrowserSetup {
    static async setupBrowser(context) {
        try {
            // Generate realistic timestamps and session IDs
            const timestamp = Math.floor(Date.now() / 1000);
            const sessionId = Math.random().toString(36).substring(2, 15);
            const deviceId = Math.random().toString(36).substring(2, 10);

            const storageState = {
                cookies: [
                    {
                        name: 'session-id',
                        value: sessionId,
                        domain: '.'+process.env.retname+'.com',
                        path: '/',
                        secure: true,
                        sameSite: 'Lax',
                        expires: timestamp + 86400
                    },
                    {
                        name: 'session-token',
                        value: sessionId,
                        domain: '.'+process.env.retname+'.com',
                        path: '/',
                        secure: true,
                        sameSite: 'Lax',
                        expires: timestamp + 86400
                    },
                    {
                        name: 'i18n-prefs',
                        value: 'USD',
                        domain: '.'+process.env.retname+'.com',
                        path: '/',
                        secure: true,
                        sameSite: 'Lax',
                        expires: timestamp + 86400
                    },
                    {
                        name: 'ubid-main',
                        value: deviceId,
                        domain: '.'+process.env.retname+'.com',
                        path: '/',
                        secure: true,
                        sameSite: 'Lax',
                        expires: timestamp + 31536000
                    }
                ],
                origins: [
                    {
                        origin: 'https://www.'+process.env.retname+'.com',
                        localStorage: [
                            {
                                name: 'session-token',
                                value: sessionId
                            },
                            {
                                name: 'deviceId',
                                value: deviceId
                            }
                        ]
                    }
                ]
            };

            // Set browser headers
            await context.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            });

            // Add cookies
            await context.addCookies(storageState.cookies);

            // Add localStorage items
            for (const origin of storageState.origins) {
                let page = null;
                try {
                    page = await context.newPage();
                    
                    // Navigate to the page first
                    await page.goto(origin.origin, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 30000
                    });
                    
                    // Set localStorage items
                    for (const item of origin.localStorage) {
                        await page.evaluate(([key, value]) => {
                            try {
                                localStorage.setItem(key, value);
                            } catch (e) {
                                console.warn(`Failed to set localStorage for ${key}:`, e);
                            }
                        }, [item.name, item.value]);
                    }
                } catch (error) {
                    console.error('Error during page setup:', error);
                } finally {
                    if (page) {
                        try {
                            await page.close();
                        } catch (e) {
                            console.warn('Error closing page:', e);
                        }
                    }
                }
            }

            return {
                cleanup: async () => {
                    try {
                        await context.clearCookies();
                        const pages = await context.pages();
                        for (const page of pages) {
                            await page.evaluate(() => {
                                try {
                                    localStorage.clear();
                                    sessionStorage.clear();
                                } catch (e) {
                                    console.warn('Error clearing storage:', e);
                                }
                            });
                        }
                    } catch (error) {
                        console.error('Cleanup error:', error);
                    }
                }
            };
        } catch (error) {
            console.error('Browser setup error:', error);
            throw error;
        }
    }
}

module.exports = initialBrowserSetup;