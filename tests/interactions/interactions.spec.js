import { test } from '@playwright/test';
import { readExcelFile } from '../../utils/excelReader.js';
import path from 'path';
import fs from 'fs';
import { ActionHelper } from '../../utils/actionHelper.js';
import dotenv from 'dotenv';
import { retailerConfig } from '../../config/retailers.js';
const initialBrowserSetup = require('../../utils/initialBrowserSetup.js');
const { createBrowserSession } = initialBrowserSetup;

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

// Initial navigation with better error handling and retry mechanism
async function navigateWithRetry(page, url, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            return;
        } catch (err) {
            console.warn(`Navigation attempt ${attempt} failed:`, err);
            if (attempt === maxRetries) throw err;
            await page.waitForTimeout(2000); // Wait before retry
        }
    }
}

test.describe(`${retailer.toUpperCase()} E2E Test Suite`, () => {
    test.setTimeout(300000);
    let warmContext;

    test.beforeAll(async ({ browser }, testInfo) => {
        try {
            testInfo.annotations.push({ type: 'epic', description: 'E2E Tests' });
            testInfo.annotations.push({ type: 'feature', description: retailer.toUpperCase() + ' E2E Tests' });

            warmContext = await createBrowserSession(browser);
        } catch (error) {
            console.error('Failed to create browser session:', error);
            throw error;
        }
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
        try {
            if (testInfo.status !== 'passed') {
                const screenshot = await captureScreenshot(page);
                if (screenshot) {
                    await testInfo.attach(`${retailer}-error-state`, {
                        body: screenshot,
                        contentType: 'image/jpeg'
                    });
                }
            }
        } catch (error) {
            console.error('Failed to capture failure state:', error);
        } finally {
            await initialBrowserSetup.cleanup(page, context).catch(err => 
                console.error('Cleanup error:', err)
            );
        }
    });

    Object.entries(testCases).forEach(([testId, steps]) => {
        test(`${retailer.toUpperCase()} - ${testId}`, async ({ browser }, testInfo) => {
            // Remove the duplicate initialization and keep only one stepStats declaration
            const stepStats = {
                totalSteps: steps.filter(step => step.Enabled?.toLowerCase() !== 'no').length,
                executedSteps: 0,
                playwrightSteps: 0,
                aiSteps: 0,
                failedSteps: 0,
                skippedSteps: 0
            };

            // Modify executeStep to accept stepStats as a parameter
            const executeStep = async (currentPage, step, actionHelper, test) => {
                if (!currentPage || currentPage.isClosed()) {
                    throw new Error('Invalid or closed page');
                }

                try {
                    if (step.waitBefore) {
                        await currentPage.waitForTimeout(parseInt(step.waitBefore));
                    }

                    switch (step.action.toLowerCase()) {
                        case 'goto':
                            stepStats.playwrightSteps++;
                            await actionHelper.handleGoto(currentPage, step, test);
                            if (initialBrowserSetup.handleAntibotChallenge) {
                                await initialBrowserSetup.handleAntibotChallenge(currentPage);
                            }
                            break;
                        case 'type':
                            stepStats.playwrightSteps++;
                            await actionHelper.handleInputData(currentPage, step, test);
                            break;
                        case 'click':
                            stepStats.playwrightSteps++;
                            await actionHelper.handleTextBasedClick(currentPage, step, test);
                            break;
                        case 'scroll':
                            stepStats.playwrightSteps++;
                            await actionHelper.handleScroll(currentPage, step, test);
                            break;
                        case 'waitfortext':
                            stepStats.playwrightSteps++;
                            await actionHelper.handleCheckVisible(currentPage, step, test);
                            break;
                        case 'assert':
                            stepStats.playwrightSteps++;
                            await actionHelper.handleAssert(currentPage, step, test);
                            break;
                        case 'cartassert':
                            stepStats.playwrightSteps++;
                            await actionHelper.handleCartAssert(currentPage, step, test);
                            break;
                        default:
                            if (!step.action) {
                                throw new Error('Missing action in step');
                            }
                            stepStats.aiSteps++;
                            await actionHelper.handleAiCommand(currentPage, step, test);
                            break;
                    }

                    if (step.waitAfter) {
                        await currentPage.waitForTimeout(parseInt(step.waitAfter));
                    }
                } catch (error) {
                    console.error(`Failed to execute step ${step.action}:`, error);
                    throw error;
                }
            };

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

                // Initial navigation with better error handling and retry mechanism
                await navigateWithRetry(currentPage, `https://www.${config.domain}`);

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

                            await executeStep(currentPage, step, actionHelper, test);

                            // Increment executed steps count
                            stepStats.executedSteps++;
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