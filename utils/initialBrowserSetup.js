class initialBrowserSetup {
    static async setupBrowser(context) {
        const storageState = {
            cookies: [
                {
                    name: 'session-id',
                    value: Date.now().toString(),
                    domain: '.amazon.com',
                    path: '/',
                },
                {
                    name: 'i18n-prefs',
                    value: 'USD',
                    domain: '.amazon.com',
                    path: '/',
                },
            ],
            origins: [
                {
                    origin: 'https://www.amazon.com',
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

        await context.addCookies(storageState.cookies);
        
        // Add localStorage items
        for (const origin of storageState.origins) {
            const page = await context.newPage();
            await page.goto(origin.origin);
            for (const item of origin.localStorage) {
                await page.evaluate(([key, value]) => {
                    localStorage.setItem(key, value);
                }, [item.name, item.value]);
            }
            await page.close()
        }
    }
}

module.exports = initialBrowserSetup;