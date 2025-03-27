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
                        domain: `.${config.domain}`,
                        path: '/',
                    },
                    {
                        name: 'i18n-prefs',
                        value: 'USD',
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

            // Add cookies in one batch
            await context.addCookies(storageState.cookies);

            // Set up localStorage with minimal page interactions
            const page = await context.newPage();
            try {
                // Single navigation with optimized settings
                await page.goto(`https://www.${config.domain}`, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });

                // Set all localStorage items in one operation
                await page.evaluate((items) => {
                    items.forEach(item => localStorage.setItem(item.name, item.value));
                }, storageState.origins[0].localStorage);

            } finally {
                await page.close();
            }

            return context;
        } catch (error) {
            console.error('Browser setup failed:', error.message);
            throw error;
        }
    }

    static async cleanup(page, context) {
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
}

export default initialBrowserSetup;