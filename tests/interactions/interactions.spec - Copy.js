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
        return await page.screenshot({
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
        startTime: new Date(),
        endTime: null
    };

    test.beforeAll(async ({ browser }, testInfo) => {
        sharedContext = await browser.newContext();
        await initialBrowserSetup.setupBrowser(sharedContext);

        testInfo.annotations.push({ type: 'epic', description: 'E2E Tests' });
        testInfo.annotations.push({ type: 'feature', description: retailer.toUpperCase() });
    });

    test.beforeEach(async ({ browser, context }, testInfo) => {
        const metadata = {
            browser: testInfo.project.name,
            retailer: retailer.toUpperCase(),
            domain: config.domain,
            testFile: config.excelFile
        };

        Object.entries(metadata).forEach(([key, value]) => {
            testInfo.annotations.push({ type: key, description: value });
        });

        testInfo.annotations.push(
            { type: 'Browser', description: testInfo.project.name },
            { type: 'Test Environment', description: `${retailer.toUpperCase()} - ${config.domain}` }
        );

        await testInfo.attach('retailer-config', {
            body: Buffer.from(JSON.stringify({
                retailer,
                config,
                testFile: config.excelFile
            }, null, 2)),
            contentType: 'application/json'
        });
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

        // Log execution stats to console only
        console.log('Test Execution Summary:', {
            duration: `${Math.round(duration / 1000)}s`,
            steps: {
                total: executionStats.totalSteps,
                playwright: executionStats.playwrightSteps,
                zerostep: executionStats.zerostepSteps,
                failed: executionStats.failedSteps
            },
            success_rate: `${Math.round(((executionStats.totalSteps - executionStats.failedSteps) / executionStats.totalSteps) * 100)}%`
        });
    });

    Object.entries(testCases).forEach(([testId, steps]) => {
        test(`${retailer.toUpperCase()} - ${testId}`, async ({ browser, context }, testInfo) => {
            // Use the shared context instead of creating a new one
            const page = await initialBrowserSetup.setupBrowser(context);
            const actionHelper = new ActionHelper(page);

            testInfo.annotations.push(
                { type: 'story', description: testId },
                { type: 'suite', description: `${retailer.toUpperCase()} Test Suite` },
                {
                    type: 'description', description: `
                    Retailer: ${retailer.toUpperCase()}
                    Test ID: ${testId}
                    Steps Count: ${steps.length}
                    Domain: ${config.domain}
                ` }
            );

            testInfo.annotations.push(
                { type: 'Test ID', description: testId },
                { type: 'Steps Count', description: String(steps.length) },
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
                    executionStats.totalSteps++;

                    await test.step(`${step.action}: ${step.locator || ''}`, async () => {
                        try {
                            if (step.waitBefore) {
                                const waitTime = Math.min(parseInt(step.waitBefore), 5000);
                                await page.waitForTimeout(waitTime);
                            }

                            // Dynamic action handling with timeouts
                            switch (step.action.toLowerCase()) {
                                case 'goto':
                                    await Promise.race([
                                        actionHelper.handleGoto(page, step, test),
                                        new Promise((_, reject) =>
                                            setTimeout(() => reject(new Error('Navigation timeout')), 60000)
                                        )
                                    ]);
                                    executionStats.playwrightSteps++;
                                    break;

                                case 'type':
                                    await Promise.race([
                                        actionHelper.handleInputData(page, step, test),
                                        new Promise((_, reject) =>
                                            setTimeout(() => reject(new Error('Input timeout')), 30000)
                                        )
                                    ]);
                                    executionStats.playwrightSteps++;
                                    break;

                                case 'click':
                                    try {
                                        await actionHelper.handleTextBasedClick(page, step, test);
                                        executionStats.playwrightSteps++;
                                    } catch (error) {
                                        console.error(`Click action failed: ${error.message}`);
                                        executionStats.failedSteps++;
                                        throw error;
                                    }
                                    break;
                                case 'scroll':
                                    await Promise.race([
                                        actionHelper.handleScroll(page, step, test),
                                        new Promise((_, reject) =>
                                            setTimeout(() => reject(new Error('Scroll timeout')), 30000)
                                        )
                                    ]);
                                    executionStats.playwrightSteps++;
                                    break;

                                case 'waitfortext':
                                    await Promise.race([
                                        actionHelper.handleCheckVisible(page, step, test),
                                        new Promise((_, reject) =>
                                            setTimeout(() => reject(new Error('Wait timeout')), 30000)
                                        )
                                    ]);
                                    executionStats.playwrightSteps++;
                                    break;

                                default:
                                    await actionHelper.handleAiCommand(page, step, test);
                                    executionStats.zerostepSteps++;
                                    break;
                            }

                            if (step.waitAfter) {
                                const waitTime = Math.min(parseInt(step.waitAfter), 5000);
                                await page.waitForTimeout(waitTime);
                            }

                            // Optimized screenshot capture with retry
                            let stepScreenshot = null;
                            for (let attempt = 1; attempt <= 2; attempt++) {
                                try {
                                    stepScreenshot = await captureScreenshot(page, attempt === 1 ? 10000 : 5000);
                                    if (stepScreenshot) break;
                                } catch (screenshotError) {
                                    console.warn(`Screenshot attempt ${attempt} failed: ${screenshotError.message}`);
                                    if (attempt === 2) break;
                                }
                            }

                            if (stepScreenshot) {
                                await testInfo.attach(`${retailer}-${step.action}-success`, {
                                    body: stepScreenshot,
                                    contentType: 'image/jpeg'
                                });
                            }

                        } catch (error) {
                            console.error(`Step failed: ${step.action}`, error);

                            try {
                                const errorScreenshot = await captureScreenshot(page, 5000);
                                if (errorScreenshot) {
                                    await testInfo.attach(`${retailer}-error-state`, {
                                        body: errorScreenshot,
                                        contentType: 'image/jpeg'
                                    });
                                }
                            } catch (screenshotError) {
                                console.warn('Failed to capture error screenshot:', screenshotError.message);
                            }

                            await testInfo.attach('error-details', {
                                body: Buffer.from(JSON.stringify({
                                    error: error.message,
                                    stack: error.stack,
                                    action: step.action,
                                    locator: step.locator,
                                    value: step.value,
                                    timestamp: new Date().toISOString()
                                }, null, 2)),
                                contentType: 'application/json'
                            });

                            executionStats.failedSteps++;
                            throw error;
                        }
                    });
                }

            } catch (error) {
                console.error(`${retailer.toUpperCase()} Test Case ${testId} failed:`, error);
                executionStats.failedSteps++;

                try {
                    const finalScreenshot = await captureScreenshot(page, 5000);
                    if (finalScreenshot) {
                        await testInfo.attach(`${retailer}-final-error-state`, {
                            body: finalScreenshot,
                            contentType: 'image/jpeg'
                        });
                    }
                } catch (screenshotError) {
                    console.warn('Failed to capture final error state:', screenshotError.message);
                }

                throw error;
            }
        });
    });
});