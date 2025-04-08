import { test } from '@playwright/test';
import { readExcelFile } from '../../utils/excelReader.js';
import path from 'path';
import fs from 'fs';
import { ActionHelper } from '../../utils/actionHelper.js';
import dotenv from 'dotenv';
import { retailerConfig } from '../../config/retailers.js';
import initialBrowserSetup, { createBrowserSession } from '../../utils/initialBrowserSetup.js';

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

            // Track step statistics
            const stepStats = {
                totalSteps: steps.filter(step => step.Enabled?.toLowerCase() !== 'no').length,
                executedSteps: 0,
                playwrightSteps: 0,
                aiSteps: 0,
                failedSteps: 0,
                skippedSteps: 0
            };

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

                // Check for antibot challenges ONLY after initial navigation
                if (initialBrowserSetup.handleAntibotChallenge) {
                    await initialBrowserSetup.handleAntibotChallenge(currentPage);
                }

                // Execute test steps with better error handling
                for (const step of steps) {
                    if (step.Enabled?.toLowerCase() === 'no') {
                        stepStats.skippedSteps++;
                        continue;
                    }

                    await test.step(`${step.action}: ${step.locator || ''}`, async () => {
                        try {
                            if (currentPage.isClosed()) {
                                throw new Error('Current page is closed');
                            }

                            if (step.waitBefore) {
                                await currentPage.waitForTimeout(parseInt(step.waitBefore))
                                    .catch(() => { });
                            }

                            actionHelper.setPage(currentPage);

                            // Increment executed steps count
                            stepStats.executedSteps++;

                            // Execute action with error handling
                            switch (step.action.toLowerCase()) {
                                case 'goto':
                                    await actionHelper.handleGoto(currentPage, step, test);
                                    stepStats.playwrightSteps++;
                                    // ALWAYS check for antibot after explicit navigation
                                    if (initialBrowserSetup.handleAntibotChallenge) {
                                        await initialBrowserSetup.handleAntibotChallenge(currentPage);
                                    }
                                    break;

                                case 'type':
                                    await actionHelper.handleInputData(currentPage, step, test);
                                    stepStats.playwrightSteps++;
                                    break;

                                case 'click':
                                    await actionHelper.handleTextBasedClick(currentPage, step, test);
                                    stepStats.playwrightSteps++;
                                    await currentPage.waitForLoadState('domcontentloaded').catch(() => { });
                                    break;

                                case 'scroll':
                                    await actionHelper.handleScroll(currentPage, step, test);
                                    stepStats.playwrightSteps++;
                                    break;

                                case 'waitfortext':
                                    await actionHelper.handleCheckVisible(currentPage, step, test);
                                    stepStats.playwrightSteps++;
                                    break;

                                case 'assert':
                                    await actionHelper.handleAssert(currentPage, step, test);
                                    stepStats.playwrightSteps++;
                                    break;

                                case 'cartassert':
                                    await actionHelper.handleCartAssert(currentPage, step, test);
                                    stepStats.playwrightSteps++;
                                    break;

                                default:
                                    await actionHelper.handleAiCommand(currentPage, step, test);
                                    stepStats.aiSteps++;
                                    break;
                            }

                            if (step.waitAfter) {
                                await currentPage.waitForTimeout(parseInt(step.waitAfter))
                                    .catch(() => { });
                            }
                        } catch (error) {
                            console.error(`Step execution error: ${error.message}`);
                            stepStats.failedSteps++;
                            throw error;
                        }
                    });
                }

                // Calculate success rate and completion percentage
                const successRate = Math.round(((stepStats.executedSteps - stepStats.failedSteps) / stepStats.executedSteps) * 100);
                const completionRate = Math.round((stepStats.executedSteps / stepStats.totalSteps) * 100);

                // Create a more visually prominent HTML summary
                const htmlSummary = `
<div class="step-stats-container" style="margin: 20px 0; padding: 15px; border-radius: 8px; background-color: #f5f7fa; border: 1px solid #d0d7de; max-width: 800px; font-family: system-ui, sans-serif;">
    <h2 style="color: #24292f; margin-top: 0; border-bottom: 1px solid #d0d7de; padding-bottom: 10px; font-size: 18px;">Test Execution Report: ${retailer.toUpperCase()} - ${testId}</h2>
    <div style="display: flex; margin-bottom: 15px;">
        <div style="flex: 1; text-align: center; padding: 10px; background-color: ${successRate >= 90 ? '#dafbe1' : successRate >= 70 ? '#fff8c5' : '#ffebe9'}; border-radius: 6px; margin-right: 10px;">
            <div style="font-size: 22px; font-weight: bold; color: ${successRate >= 90 ? '#1a7f37' : successRate >= 70 ? '#9a6700' : '#cf222e'};">${successRate}%</div>
            <div style="font-size: 14px; color: #57606a;">Success Rate</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 10px; background-color: #f6f8fa; border-radius: 6px;">
            <div style="font-size: 22px; font-weight: bold; color: #24292f;">${completionRate}%</div>
            <div style="font-size: 14px; color: #57606a;">Completion Rate</div>
        </div>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr style="background-color: #f6f8fa;">
            <th style="text-align: left; padding: 8px 12px; border: 1px solid #d0d7de;">Metric</th>
            <th style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">Count</th>
            <th style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">Percentage</th>
        </tr>
        <tr>
            <td style="padding: 8px 12px; border: 1px solid #d0d7de;">Total Available Steps</td>
            <td style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">${stepStats.totalSteps}</td>
            <td style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">100%</td>
        </tr>
        <tr style="background-color: #f6f8fa;">
            <td style="padding: 8px 12px; border: 1px solid #d0d7de;">Executed Steps Count</td>
            <td style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">${stepStats.executedSteps}</td>
            <td style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">${completionRate}%</td>
        </tr>
        <tr>
            <td style="padding: 8px 12px; border: 1px solid #d0d7de;">Step Executed by Playwright</td>
            <td style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">${stepStats.playwrightSteps}</td>
            <td style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">${Math.round((stepStats.playwrightSteps / stepStats.executedSteps) * 100)}%</td>
        </tr>
        <tr style="background-color: #f6f8fa;">
            <td style="padding: 8px 12px; border: 1px solid #d0d7de;">Steps Executed by AI</td>
            <td style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">${stepStats.aiSteps}</td>
            <td style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">${Math.round((stepStats.aiSteps / stepStats.executedSteps) * 100)}%</td>
        </tr>
        <tr>
            <td style="padding: 8px 12px; border: 1px solid #d0d7de;">Failed Steps Count</td>
            <td style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">${stepStats.failedSteps}</td>
            <td style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">${Math.round((stepStats.failedSteps / stepStats.executedSteps) * 100)}%</td>
        </tr>
        <tr style="background-color: #f6f8fa;">
            <td style="padding: 8px 12px; border: 1px solid #d0d7de;">Skipped Steps Count</td>
            <td style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">${stepStats.skippedSteps}</td>
            <td style="text-align: center; padding: 8px 12px; border: 1px solid #d0d7de;">${Math.round((stepStats.skippedSteps / stepStats.totalSteps) * 100)}%</td>
        </tr>
    </table>
</div>`;

                // Attach the HTML report with a more distinct name
                await testInfo.attach('📊 Test Execution Summary', {
                    body: htmlSummary,
                    contentType: 'text/html'
                });

                // Add step statistics as annotations for the report
                testInfo.annotations.push(
                    { type: 'Step Statistics', description: 'Summary of test step execution' },
                    { type: 'Total Steps', description: `${stepStats.totalSteps}` },
                    { type: 'Executed Steps', description: `${stepStats.executedSteps}` },
                    { type: 'Playwright Steps', description: `${stepStats.playwrightSteps}` },
                    { type: 'AI Steps', description: `${stepStats.aiSteps}` },
                    { type: 'Failed Steps', description: `${stepStats.failedSteps}` },
                    { type: 'Skipped Steps', description: `${stepStats.skippedSteps}` },
                    { type: 'Success Rate', description: `${successRate}%` },
                    { type: 'Completion Rate', description: `${completionRate}%` }
                );

                // Log statistics to console
                console.log('\n----- Test Step Execution Statistics -----');
                console.log(`Total Steps: ${stepStats.totalSteps}`);
                console.log(`Executed Steps: ${stepStats.executedSteps} (${completionRate}%)`);
                console.log(`Playwright Steps: ${stepStats.playwrightSteps}`);
                console.log(`AI Steps: ${stepStats.aiSteps}`);
                console.log(`Failed Steps: ${stepStats.failedSteps}`);
                console.log(`Skipped Steps: ${stepStats.skippedSteps}`);
                console.log(`Success Rate: ${successRate}%`);
                console.log('-----------------------------------------\n');

            } catch (error) {
                console.error(`${retailer.toUpperCase()} Test Case ${testId} failed:`, error);
                throw error;
            } finally {
                // Cleanup only the page, not the context
                if (currentPage && !currentPage.isClosed()) {
                    await currentPage.close().catch(() => { });
                }
            }
        });
    });
});