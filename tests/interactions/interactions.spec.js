import { test } from '@playwright/test';
import { readExcelFile } from '../../utils/excelReader.js';
import path from 'path';
import fs from 'fs';
import { ActionHelper } from '../../utils/actionHelper.js';
import dotenv from 'dotenv';
import { retailerConfig } from '../../config/retailers.js';
import initialBrowserSetup from '../../utils/initialBrowserSetup.js';
import { createBrowserSession } from '../../utils/initialBrowserSetup.js';


dotenv.config();
const retailer = process.env.RETAILER || 'amazon';
const config = retailerConfig[retailer];

// Enhanced screenshot capture helper
async function captureScreenshot(page, timeout = 30000) {
    try {
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {
            console.log('Wait for document to be loaded');
        });

        // Add a small delay to allow for visual stability
        await page.waitForTimeout(500);

        // Attempt screenshot with optimized options
        return await page.screenshot(
            {
            timeout: timeout,
            type: 'jpeg',
            quality: 80,
            scale: 'css',
            animations: 'disabled'
        });
    } catch (error) {
        console.warn(`Primary screenshot capture failed: ${error.message}`);
        // Fallback attempt with minimal options
        try {
            return await page.screenshot({
                timeout: 5000,
                type: 'jpeg',
                quality: 50
            });
        } catch (retryError) {
            console.error(`Fallback screenshot failed: ${retryError.message}`);
            return null;
        }
    }
}

// Move test configuration to top level
test.use({
    retries: 1,
    actionTimeout: 30000,
    navigationTimeout: 30000,
    trace: 'retain-on-failure'
});

// Define test cases at the top level
const testCases = (() => {
    try {
        const excelPath = path.join(process.cwd(), process.env.EXCEL_DIR, config.excelFile);
        if (!fs.existsSync(excelPath)) {
            throw new Error(`Excel file not found at: ${excelPath}`);
        }
        return readExcelFile(excelPath);
    } catch (error) {
        console.error('Failed to load test cases:', error);
        return {};
    }
})();

test.describe(`${retailer.toUpperCase()} E2E Test Suite`, () => {
    test.setTimeout(300000);
    let warmContext;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.annotations.push({ type: 'epic', description: 'E2E Tests' });
        testInfo.annotations.push({ type: 'feature', description: retailer.toUpperCase() + ' E2E Tests' });
        
        // Pass the browser instance to createBrowserSession
        warmContext = await createBrowserSession(browser);
    });

    test.afterAll(async () => {
        if (warmContext) {
            await warmContext.close().catch(err => console.error('Error closing warm context:', err));
        }
    });

    test.beforeEach(async ({ browser, context }, testInfo) => {
        testInfo.annotations.push(
            { type: 'Browser', description: testInfo.project.name },
            { type: 'Test Environment', description: `${retailer.toUpperCase()} - ${config.domain}` }
        );
    });

    test.afterEach(async ({ page, context }, testInfo) => {
        if (testInfo.status !== 'passed') {
            try {
                const screenshot = await page.screenshot();
                await testInfo.attach(`${retailer}-error-state`, {
                    body: screenshot,
                    contentType: 'image/jpeg'
                });
            } catch (error) {
                console.error('Failed to capture failure state:', error);
            }
        }
        await initialBrowserSetup.cleanup(page, context);
    });

    Object.entries(testCases).forEach(([testId, steps]) => {
        test(`${retailer.toUpperCase()} - ${testId}`, async ({ browser }, testInfo) => {
            // Use the warm context or create a new one if needed
            const context = warmContext || await createBrowserSession(browser);
            const page = await context.newPage();
            const actionHelper = new ActionHelper(page);
            
            let currentPage = page;
            
            try {
                // Handle new pages with error catching
                context.on('page', async (newPage) => {
                    try {
                        await initialBrowserSetup.setupPage(newPage).catch(err => 
                            console.warn('New page setup warning:', err)
                        );
                        currentPage = newPage;
                        actionHelper.setPage(newPage);
                    } catch (error) {
                        console.warn('Page event handler warning:', error);
                    }
                });

                // Initial navigation with better error handling
                await currentPage.goto(`https://www.${config.domain}`, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                }).catch(async (err) => {
                    console.warn('Initial navigation warning:', err);
                    // Retry once on failure
                    await currentPage.goto(`https://www.${config.domain}`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 60000
                    });
                });

                // Execute test steps with better error handling
                for (const step of steps) {
                    if (step.Enabled?.toLowerCase() === 'no') continue;

                    await test.step(`${step.action}: ${step.locator || ''}`, async () => {
                        try {
                            if (currentPage.isClosed()) {
                                throw new Error('Current page is closed');
                            }

                            if (step.waitBefore) {
                                await currentPage.waitForTimeout(parseInt(step.waitBefore))
                                    .catch(() => {});
                            }

                            actionHelper.setPage(currentPage);

                            // Execute action with error handling
                            switch (step.action.toLowerCase()) {
                                case 'goto':
                                    await actionHelper.handleGoto(currentPage, step, test);
                                    break;
                                case 'type':
                                    await actionHelper.handleInputData(currentPage, step, test);
                                    break;
                                case 'click':
                                    await actionHelper.handleTextBasedClick(currentPage, step, test);
                                    await currentPage.waitForLoadState('domcontentloaded').catch(() => {});
                                    break;
                                case 'scroll':
                                    await actionHelper.handleScroll(currentPage, step, test);
                                    break;
                                case 'waitfortext':
                                    await actionHelper.handleCheckVisible(currentPage, step, test);
                                    break;
                                case 'assert':
                                    await actionHelper.handleAssert(currentPage, step, test);
                                    break;
                                case 'cartassert':
                                    await actionHelper.handleCartAssert(currentPage, step, test);
                                    break;
                                default:
                                    await actionHelper.handleAiCommand(currentPage, step, test);
                                    break;
                            }

                            if (step.waitAfter) {
                                await currentPage.waitForTimeout(parseInt(step.waitAfter))
                                    .catch(() => {});
                            }
                        } catch (error) {
                            console.error(`Step execution error: ${error.message}`);
                            throw error;
                        }
                    });
                }
            } catch (error) {
                console.error(`${retailer.toUpperCase()} Test Case ${testId} failed:`, error);
                throw error;
            } finally {
                // Cleanup only the page, not the context
                if (currentPage && !currentPage.isClosed()) {
                    await currentPage.close().catch(() => {});
                }
            }
        });
    });
});