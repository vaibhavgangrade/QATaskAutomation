import dotenv from 'dotenv';
dotenv.config();

class initialBrowserSetup {
    static async setupBrowser(context) {
        try {
            // Generate realistic timestamps and session IDs
            const timestamp = Math.floor(Date.now() / 1000);
            const sessionId = Math.random().toString(36).substring(2, 15);
            const deviceId = Math.random().toString(36).substring(2, 10);

            // Add minimal OAuth and CSP bypass
            await context.addInitScript(() => {
                // Simple CSP bypass
                const originalCreateElement = document.createElement;
                document.createElement = function(...args) {
                    const element = originalCreateElement.apply(this, args);
                    if (element.tagName === 'SCRIPT') {
                        element.setAttribute('nonce', 'bypass-csp');
                    }
                    return element;
                };

                // Basic OAuth helper
                window._handleAuth = () => {
                    const authElements = document.querySelectorAll('[class*="auth"], [id*="auth"], [class*="login"], [id*="login"]');
                    authElements.forEach(el => {
                        el.style.visibility = 'visible';
                        el.style.display = 'block';
                    });
                };
            });

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

            // Enhanced headers with auth support
            await context.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-User': '?1',
                'Sec-Fetch-Dest': 'document'
            });

            // Simple route handler for auth requests
            await context.route('**/*', async (route) => {
                const request = route.request();
                const url = request.url();
                
                if (url.includes('oauth') || url.includes('auth') || url.includes('login')) {
                    await route.continue({
                        headers: {
                            ...request.headers(),
                            'Origin': new URL(url).origin,
                            'Referer': new URL(url).origin + '/'
                        }
                    });
                } else {
                    await route.continue();
                }
            });

            // Add cookies
            await context.addCookies(storageState.cookies);

            // Add localStorage items
            for (const origin of storageState.origins) {
                let page = null;
                try {
                    page = await context.newPage();
                    
                    await page.goto(origin.origin, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 30000
                    });
                    
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