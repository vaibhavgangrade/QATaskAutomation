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
            // Set longer timeout for better stability
            context.setDefaultTimeout(60000);

            // Handle new pages
            context.on('page', async (page) => {
                await this.setupPage(page);
            });

            // Setup existing pages
            for (const page of context.pages()) {
                await this.setupPage(page);
            }

            return context;
        } catch (error) {
            console.error('Browser setup failed:', error);
            throw error;
        }
    },

    async setupPage(page) {
        try {
            // Set longer timeout for actions
            page.setDefaultTimeout(60000);

            // Handle navigation events
            page.on('framenavigated', async frame => {
                if (frame === page.mainFrame()) {
                    await frame.waitForLoadState('domcontentloaded').catch(() => {});
                }
            });

            // Handle new windows/popups
            page.on('popup', async (popup) => {
                await this.setupPage(popup);
            });

        } catch (error) {
            console.error('Page setup failed:', error);
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