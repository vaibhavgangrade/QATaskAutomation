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
        
        // Calculate success rate based on total steps
        const successfulSteps = executionStats.playwrightSteps + executionStats.zerostepSteps;
        const totalSteps = executionStats.totalSteps;
        const successRate = totalSteps > 0 ? Math.round((successfulSteps / totalSteps) * 100) : 0;

        const executionSummary = {
            retailer: retailer.toUpperCase(),
            duration: `${Math.round(duration / 1000)}s`,
            steps: {
                total: totalSteps,
                playwright: executionStats.playwrightSteps,
                zerostep: executionStats.zerostepSteps,
                failed: executionStats.failedSteps
            },
            success_rate: `${successRate}%`
        };

        // Add summary to test report
        testInfo.annotations.push({
            type: 'Execution Summary',
            description: `
                🎯 Total Steps: ${totalSteps}
                ⚡ Playwright Steps: ${executionStats.playwrightSteps} (${Math.round((executionStats.playwrightSteps/totalSteps)*100)}%)
                🤖 Zerostep Steps: ${executionStats.zerostepSteps} (${Math.round((executionStats.zerostepSteps/totalSteps)*100)}%)
                ❌ Failed Steps: ${executionStats.failedSteps}
                ✅ Success Rate: ${successRate}%
                ⏱️ Total Duration: ${Math.round(duration / 1000)}s
            `
        });

        await testInfo.attach('execution-summary', {
            body: Buffer.from(JSON.stringify(executionSummary, null, 2)),
            contentType: 'application/json'
        });
    });

    Object.entries(testCases).forEach(([testId, steps]) => {
        test(`${retailer.toUpperCase()} - ${testId}`, async ({ page, context }, testInfo) => {
            // Use the shared context instead of creating a new one
            // const page = await sharedContext.newPage();
              // Initialize browser setup for each test
              await initialBrowserSetup.setupBrowser(context);
              const actionHelper = new ActionHelper(page);

            // testInfo.annotations.push(
            //     { type: 'story', description: testId },
            //     { type: 'suite', description: `${retailer.toUpperCase()} Test Suite` },
            //     {
            //         type: 'description', description: `
            //         Retailer: ${retailer.toUpperCase()}
            //         Test ID: ${testId}
            //         Steps Count: ${steps.length}
            //         Domain: ${config.domain}
            //     ` }
            // );

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
                                await page.waitForTimeout(parseInt(step.waitBefore));
                            }

                            // Capture annotations count before step execution
                            const beforeAnnotations = test.info().annotations.length;

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

                                // Check new annotations to determine step result
                                const newAnnotations = test.info().annotations.slice(beforeAnnotations);
                                
                                // Check for Zerostep success (including fallbacks)
                                const zerostepSuccess = newAnnotations.some(a => 
                                    (a.type?.toLowerCase().includes('zerostep') && 
                                     a.description?.toLowerCase().includes('success')) ||
                                    (a.type?.toLowerCase().includes('ai command') && 
                                     a.description?.toLowerCase().includes('success')) ||
                                    (a.type?.toLowerCase().includes('fallback') && 
                                     a.description?.toLowerCase().includes('zerostep') &&
                                     a.description?.toLowerCase().includes('succeeded'))
                                );

                                // Check for Playwright success - Include more success indicators
                                const playwrightSuccess = !zerostepSuccess && newAnnotations.some(a => 
                                    (
                                        (a.description?.includes('✅') || a.description?.includes('⚡')) &&
                                        (
                                            a.description?.toLowerCase().includes('playwright') ||
                                            a.type?.toLowerCase().includes('navigation success') ||
                                            a.type?.toLowerCase().includes('assertion success') ||
                                            a.type?.toLowerCase().includes('click success') ||
                                            a.type?.toLowerCase().includes('scroll success') ||
                                            a.type?.toLowerCase().includes('visibility success')
                                        ) &&
                                        !a.description?.toLowerCase().includes('zerostep')
                                    )
                                );

                                // Check for failures (only if no success)
                                const hasFailure = !zerostepSuccess && !playwrightSuccess && 
                                    newAnnotations.some(a => 
                                        (a.description?.includes('❌') || a.type?.toLowerCase().includes('error')) && 
                                        !a.description?.toLowerCase().includes('fallback')
                                    );

                                // Update execution stats
                                if (zerostepSuccess) {
                                    executionStats.zerostepSteps++;
                                } else if (playwrightSuccess) {
                                    executionStats.playwrightSteps++;
                                } else if (hasFailure) {
                                    executionStats.failedSteps++;
                                }

                                if (step.waitAfter) {
                                    await page.waitForTimeout(parseInt(step.waitAfter));
                                }

                            } catch (error) {
                                // Only increment failedSteps if we haven't already counted this step
                                const currentAnnotations = test.info().annotations;
                                const hasFailureAnnotation = currentAnnotations.some(a => 
                                    a.description?.includes('❌') && 
                                    !a.description?.toLowerCase().includes('fallback')
                                );
                                
                                if (!hasFailureAnnotation) {
                                    executionStats.failedSteps++;
                                    test.info().annotations.push({
                                        type: 'Execution Error',
                                        description: `❌ Step failed: ${error.message}`
                                    });
                                }
                                throw error;
                            }
                        } catch (error) {
                            // This catch block handles any errors that weren't caught in the inner try-catch
                            // Only increment failedSteps if it wasn't already counted
                            const currentAnnotations = test.info().annotations;
                            const hasFailureAnnotation = currentAnnotations.some(a => 
                                a.description?.includes('❌') || 
                                a.type?.toLowerCase().includes('failed') ||
                                a.type?.toLowerCase().includes('error')
                            );
                            
                            if (!hasFailureAnnotation) {
                                executionStats.failedSteps++;
                                test.info().annotations.push({
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