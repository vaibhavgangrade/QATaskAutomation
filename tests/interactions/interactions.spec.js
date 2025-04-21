import { test } from '@playwright/test';
import { readExcelFile } from '../../utils/excelReader.js';
import path from 'path';
import fs from 'fs';
import { ActionHelper } from '../../utils/actionHelper.js';
import dotenv from 'dotenv';
import { retailerConfig } from '../../config/retailers.js';
import initialBrowserSetup from '../../utils/initialBrowserSetup.js';
import { addStealthScripts } from '../../stealth.js';

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

// Fix the handleActionWithRecovery function
async function handleActionWithRecovery(page, action, maxAttempts = 2) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Add random delay between attempts
            if (attempt > 1) {
                await page.waitForTimeout(3000 + Math.random() * 5000);
            }
            
            // Attempt the action
            await action();
            return;
            
        } catch (error) {
            lastError = error;
            console.log(`Attempt ${attempt} failed:`, error.message);
            
            // Safely check error messages
            const errorMessage = error?.message || '';
            
            // Check if it's a bot detection or other specific error
            if (errorMessage.toLowerCase().includes('blocked') || 
                errorMessage.toLowerCase().includes('captcha') || 
                errorMessage.toLowerCase().includes('security check') ||
                errorMessage.toLowerCase().includes('no valid target found')) {
                
                console.log(`Detected potential issue, implementing recovery strategy...`);
                
                // Implement progressive backoff
                const backoffDelay = attempt * (5000 + Math.random() * 5000);
                await page.waitForTimeout(backoffDelay);
                
                try {
                    // Check if page is still responsive
                    await page.evaluate(() => document.readyState);
                    
                    // Try recovery actions based on error type
                    if (errorMessage.includes('no valid target found')) {
                        // Wait for content to be available
                        await page.waitForLoadState('domcontentloaded');
                        await page.waitForTimeout(2000);
                    } else {
                        // For potential blocks, try refreshing the page
                        if (attempt === maxAttempts) {
                            await page.reload({ waitUntil: 'domcontentloaded' });
                            await page.waitForTimeout(3000);
                        }
                    }
                } catch (recoveryError) {
                    console.warn('Recovery action failed:', recoveryError.message);
                }
            } else {
                // For other errors, use shorter delays
                await page.waitForTimeout(1000 + Math.random() * 2000);
            }
            
            // If this was the last attempt, prepare to throw the error
            if (attempt === maxAttempts) {
                console.error(`All ${maxAttempts} attempts failed for action`);
            }
        }
    }
    
    // If we get here, all attempts failed
    throw new Error(`Action failed after ${maxAttempts} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
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

    test.beforeEach(async ({ browser, context, page }, testInfo) => {
        // Add stealth scripts to the page
        await addStealthScripts(page);
        
        // Add random delay to seem more human-like
        await page.waitForTimeout(1000 + Math.random() * 2000);
        
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
        
        // Calculate success rate based on successful steps
        const successfulSteps = executionStats.playwrightSteps + executionStats.zerostepSteps;
        const totalSteps = executionStats.totalSteps || 1; // Prevent division by zero
        const successRate = Math.round((successfulSteps / totalSteps) * 100);

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

        // Add summary to test report with proper percentage calculations
        testInfo.annotations.push({
            type: 'Execution Summary',
            description: `
                🎯 Total Steps: ${totalSteps}
                ⚡ Playwright Steps: ${executionStats.playwrightSteps} (${Math.round((executionStats.playwrightSteps/totalSteps)*100) || 0}%)
                🤖 Zerostep Steps: ${executionStats.zerostepSteps} (${Math.round((executionStats.zerostepSteps/totalSteps)*100) || 0}%)
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
            // Initialize browser setup first
            await initialBrowserSetup.setupBrowser(context);
            
            // Add stealth scripts again after setup
            await addStealthScripts(page);
            
            // Add random delay
            await page.waitForTimeout(1000 + Math.random() * 2000);

            const actionHelper = new ActionHelper(page);

            // Reset execution stats for this test
            executionStats.totalSteps = steps.filter(step => step.Enabled?.toLowerCase() !== 'no').length;
            executionStats.playwrightSteps = 0;
            executionStats.zerostepSteps = 0;
            executionStats.failedSteps = 0;

            testInfo.annotations.push(
                { type: 'Test ID', description: testId },
                { type: 'Steps Count', description: String(executionStats.totalSteps) },
                { type: 'Retailer', description: retailer.toUpperCase() }
            );

            try {
                // Simplified initial navigation
                await test.step(`Initial setup`, async () => {
                    // Set longer timeout for initial navigation
                    page.setDefaultTimeout(60000);
                    
                    // Add stealth scripts before navigation
                    await addStealthScripts(page);
                    
                    // Random delay before navigation
                    await page.waitForTimeout(2000 + Math.random() * 3000);
                    
                    // Basic navigation without complex waiting
                    await page.goto(`https://www.${config.domain}`, {
                        waitUntil: 'domcontentloaded'
                    });

                    // Simple wait for page load
                    await page.waitForLoadState('load').catch(() => {});
                    
                    // Add random delay after navigation
                    await page.waitForTimeout(2000 + Math.random() * 2000);
                });

                // Execute test steps
                for (const step of steps) {
                    if (step.Enabled?.toLowerCase() === 'no') continue;

                    await test.step(`${step.action}: ${step.locator || ''}`, async () => {
                        const beforeAnnotations = testInfo.annotations.length;

                        try {
                            await handleActionWithRecovery(page, async () => {
                                // Minimal delay before action
                                if (step.waitBefore) {
                                    await page.waitForTimeout(parseInt(step.waitBefore));
                                }

                                // Quick content check
                                await Promise.race([
                                    page.waitForFunction(() => {
                                        return document.readyState === 'complete' && 
                                               document.body !== null;
                                    }, { timeout: 5000 }),
                                    page.waitForTimeout(6000)
                                ]).catch(() => {});

                                // Execute the action
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
                                    case 'select':
                                        await actionHelper.handleRadioButton(page, step, test);
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

                                if (step.waitAfter) {
                                    await page.waitForTimeout(parseInt(step.waitAfter));
                                }
                            });

                            // After action execution, check annotations
                            const newAnnotations = testInfo.annotations.slice(beforeAnnotations);
                            
                            // Update step counts based on annotations
                            if (newAnnotations.some(a => 
                                a.type === 'AI Command Success' || 
                                a.description?.includes('Action completed using Zerostep')
                            )) {
                                executionStats.zerostepSteps++;
                            }
                            else if (newAnnotations.some(a => 
                                (a.description?.startsWith('✅') || a.description?.startsWith('⚡')) &&
                                !a.description?.toLowerCase().includes('zerostep')
                            )) {
                                executionStats.playwrightSteps++;
                            }
                            else if (newAnnotations.some(a => 
                                a.description?.includes('❌') || 
                                a.type?.toLowerCase().includes('error')
                            )) {
                                executionStats.failedSteps++;
                            }
                        } catch (error) {
                            // Check if error was handled by Zerostep
                            const errorAnnotations = testInfo.annotations.slice(beforeAnnotations);
                            if (errorAnnotations.some(a => 
                                a.type === 'AI Command Success' || 
                                a.description?.includes('Action completed using Zerostep')
                            )) {
                                executionStats.zerostepSteps++;
                            } else {
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
                console.error(`Test Case ${testId} failed:`, error);
                throw error;
            }
        });
    });
});