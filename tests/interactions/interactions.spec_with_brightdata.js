import { test } from '@playwright/test';
import { readExcelFile } from '../../utils/excelReader.js';
import path from 'path';
import fs from 'fs';
import { ActionHelper } from '../../utils/actionHelper.js';
import dotenv from 'dotenv';
import { retailerConfig } from '../../config/retailers.js';
import initialBrowserSetup from '../../utils/initialBrowserSetup.js';


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
    let sharedContext;

    const executionStats = {
        retailer,
        domain: config.domain,
        totalSteps: 0,
        playwrightSteps: 0,
        zerostepSteps: 0,
        failedSteps: 0,
        skippedSteps: 0,
        startTime: new Date(),
        endTime: null
    };

    test.beforeAll(async ({ browser }, testInfo) => {
        // sharedContext = await browser.newContext();
        // await initialBrowserSetup.setupBrowser(sharedContext);

        testInfo.annotations.push({ type: 'epic', description: 'E2E Tests' });
        testInfo.annotations.push({ type: 'feature', description: retailer.toUpperCase() + ' E2E Tests' });
    });

    test.beforeEach(async ({ browser, context }, testInfo) => {
        // Add basic test information annotations
        testInfo.annotations.push(
            { type: 'Browser', description: testInfo.project.name },
            { type: 'Test Environment', description: `${retailer.toUpperCase()} - ${config.domain}` }
        );
    });

    test.afterEach(async ({ page }, testInfo) => {
        if (testInfo.status !== 'passed') {
            try {
                const screenshot = await captureScreenshot(page, 10000);
                if (screenshot) {
                    await testInfo.attach(`${retailer}-error-state`, {
                        body: screenshot,
                        contentType: 'image/jpeg'
                    });
                }

                const failureDetails = {
                    retailer,
                    testId: testInfo.title,
                    status: testInfo.status,
                    error: testInfo.error?.message,
                    duration: testInfo.duration,
                    screenshotCaptured: !!screenshot
                };

                await testInfo.attach('test-failure-details', {
                    body: Buffer.from(JSON.stringify(failureDetails, null, 2)),
                    contentType: 'application/json'
                });

                testInfo.annotations.push({
                    type: 'description',
                    description: `Test failed: ${testInfo.error?.message}`
                });
            } catch (error) {
                console.error('Failed to capture failure state:', error);
            }
        }
    });

    test.afterAll(async ({ }, testInfo) => {
        executionStats.endTime = new Date();
        const duration = executionStats.endTime - executionStats.startTime;
        
        const successfulSteps = executionStats.playwrightSteps + executionStats.zerostepSteps;
        const successRate = Math.round((successfulSteps / executionStats.totalSteps) * 100);

        testInfo.annotations.push({
            type: 'Execution Summary',
            description: `
                🎯 Total Steps: ${executionStats.totalSteps}
                ⚡ Playwright Steps: ${executionStats.playwrightSteps} (${Math.round((executionStats.playwrightSteps/executionStats.totalSteps)*100)}%)
                🤖 Zerostep Steps: ${executionStats.zerostepSteps} (${Math.round((executionStats.zerostepSteps/executionStats.totalSteps)*100)}%)
                ❌ Failed Steps: ${executionStats.failedSteps}
                ⏸️ Skipped Steps: ${executionStats.skippedSteps}
                ✅ Success Rate: ${successRate}%
                ⏱️ Total Duration: ${Math.round(duration / 1000)}s
            `
        });
    });

    Object.entries(testCases).forEach(([testId, steps]) => {
        test(`${retailer.toUpperCase()} - ${testId}`, async ({ page, context }, testInfo) => {
            await initialBrowserSetup.setupBrowser(context);
            const actionHelper = new ActionHelper(page);

            // Reset execution stats for each test
            executionStats.totalSteps = steps.filter(step => step.Enabled?.toLowerCase() !== 'no').length;
            executionStats.playwrightSteps = 0;
            executionStats.zerostepSteps = 0;
            executionStats.failedSteps = 0;
            executionStats.skippedSteps = steps.filter(step => step.Enabled?.toLowerCase() === 'no').length;

            testInfo.annotations.push(
                { type: 'Test ID', description: testId },
                { type: 'Steps Count', description: String(executionStats.totalSteps) },
                { type: 'Retailer', description: retailer.toUpperCase() }
            );

            try {
                // Initial navigation with timeout
                await test.step(`Navigate to ${config.domain}`, async () => {
                    await page.goto(`https://www.${config.domain}`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 60000
                    });


                    try {
                        const screenshot = await captureScreenshot(page, 10000);
                        if (screenshot) {
                            await testInfo.attach(`${retailer}-initial-page`, {
                                body: screenshot,
                                contentType: 'image/jpeg'
                            });
                        }
                    } catch (screenshotError) {
                        console.warn(`Initial screenshot failed: ${screenshotError.message}`);
                    }
                });

                // Execute test steps
                for (const step of steps) {
                    if (step.Enabled?.toLowerCase() === 'no') {
                        continue;
                    }

                    await test.step(`${step.action}: ${step.locator || ''}`, async () => {
                        try {
                            if (step.waitBefore) {
                                await page.waitForTimeout(parseInt(step.waitBefore));
                            }

                            const beforeAnnotations = testInfo.annotations.length;

                            try {
                                switch (step.action.toLowerCase()) {
                                    case 'goto':
                                        await actionHelper.handleGoto(page, step, test);
                                        break;
                                    case 'type':
                                        await actionHelper.handleInputData(page, step, test);
                                        break;
                                    case 'click':
                                        await actionHelper.handleTextBasedClick(page, step, test);
                                        break;
                                    case 'scroll':
                                        await actionHelper.handleScroll(page, step, test);
                                        break;
                                    case 'waitfortext':
                                        await actionHelper.handleCheckVisible(page, step, test);
                                        break;
                                    case 'assert':
                                        await actionHelper.handleAssert(page, step, test);
                                        break;
                                    case 'cartassert':
                                        await actionHelper.handleCartAssert(page, step, test);
                                        break;
                                    default:
                                        await actionHelper.handleAiCommand(page, step, test);
                                        break;
                                }

                                // Check annotations immediately after action
                                const newAnnotations = testInfo.annotations.slice(beforeAnnotations);
                                
                                // Check for Zerostep success
                                if (newAnnotations.some(a => 
                                    a.type === 'Zerostep Success' || 
                                    a.description?.includes('Action completed using Zerostep') ||
                                    (a.type?.toLowerCase().includes('fallback') && 
                                     a.description?.toLowerCase().includes('zerostep'))
                                )) {
                                    executionStats.zerostepSteps++;
                                }
                                // Check for Playwright success
                                else if (newAnnotations.some(a => 
                                    (a.description?.includes('✅') || a.description?.includes('⚡')) &&
                                    !a.description?.toLowerCase().includes('zerostep')
                                )) {
                                    executionStats.playwrightSteps++;
                                }
                                // Check for failures
                                else if (newAnnotations.some(a => 
                                    (a.description?.includes('❌') || 
                                     a.type?.toLowerCase().includes('error')) &&
                                    !a.description?.toLowerCase().includes('fallback')
                                )) {
                                    executionStats.failedSteps++;
                                }

                                if (step.waitAfter) {
                                    await page.waitForTimeout(parseInt(step.waitAfter));
                                }

                            } catch (error) {
                                // Check if the error was handled by Zerostep
                                const errorAnnotations = testInfo.annotations.slice(beforeAnnotations);
                                if (errorAnnotations.some(a => 
                                    a.type === 'Zerostep Success' || 
                                    a.description?.includes('Action completed using Zerostep')
                                )) {
                                    executionStats.zerostepSteps++;
                                } else {
                                    executionStats.failedSteps++;
                                }
                                throw error;
                            }
                        } catch (error) {
                            // Only count as failed if not already counted as Zerostep success
                            if (!testInfo.annotations.some(a => 
                                a.type === 'Zerostep Success' || 
                                a.description?.includes('Action completed using Zerostep')
                            )) {
                                executionStats.failedSteps++;
                                testInfo.annotations.push({
                                    type: 'Execution Error',
                                    description: `❌ Step failed: ${error.message}`
                                });
                            }
                            throw error;
                        }
                    });
                }

            } catch (error) {
                console.error(`${retailer.toUpperCase()} Test Case ${testId} failed:`, error);
                throw error;
            }
        });
    });
});