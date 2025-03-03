import { test, expect } from '@playwright/test';
import { readExcelFile } from '../utils/excelReader';
import path from 'path';
import fs from 'fs';
import initialBrowserSetup from '../utils/initialBrowserSetup';
import { ActionHelper } from '../utils/actionHelper.js';
import { handleStepError, cleanup } from '../utils/errorHandler.js';

test.describe('Test Automation', () => {
    test.setTimeout(300000); // 5 minutes

    let testSteps;
    let actionHelper;

    test.beforeAll(async () => {
        try {
            actionHelper = new ActionHelper();
            const excelPath = path.join(process.cwd(), 'testData', 'bluenile.xlsx');

            if (!fs.existsSync(excelPath)) {
                console.error(`Excel file not found at: ${excelPath}`);
                throw new Error(`Excel file not found at: ${excelPath}`);
            }

            console.log(`Reading Excel file from: ${excelPath}`);
            testSteps = readExcelFile(excelPath);
            console.log(`Successfully loaded ${testSteps.length} steps from Excel`);

            if (testSteps.length > 0) {
                console.log('Sample step:', testSteps[0]);
            }

        } catch (error) {
            console.error('Error in beforeAll:', error);
            throw error;
        }
    });

    test('Execute Excel Steps', async ({ page, context }) => {
        try {
            await initialBrowserSetup.setupBrowser(context);
            page.setDefaultTimeout(60000);
            page.setDefaultNavigationTimeout(60000);

            await page.goto('https://www.bluenile.com/', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            for (let i = 0; i < testSteps.length; i++) {
                const stepStartTime = Date.now();
                const maxStepTime = 60000; // 1 minute timeout per step
                const step = testSteps[i];

                console.log(`\nExecuting step ${i + 1} of ${testSteps.length}:`, step);

                try {
                    const stepPromise = (async () => {
                        if (step.waitBefore) {
                            await page.waitForTimeout(parseInt(step.waitBefore));
                        }

                        switch (step.action.toLowerCase()) {
                            case 'goto':
                                await actionHelper.handleGoto(page, step);
                                break;
                            case 'assert':
                                await actionHelper.handleAssert(page, step);
                                break;
                            case 'request':
                                await actionHelper.handleRequest(step, i);
                                break;
                            case 'response':
                                await actionHelper.handleResponse(page, step, test);
                                break;
                            case 'scrollto':
                                await actionHelper.handleScrollTo(page, step);
                                break;
                            case 'clickto':
                                await actionHelper.handleClickTo(page, step);
                                break;
                            case 'filldata':
                                await actionHelper.handleFillData(page, step);
                                break;
                            case 'presskey':
                                await actionHelper.handlePressKey(page, step);
                                break;
                            case 'clickloc':
                                await actionHelper.handleClickLoc(page, step);
                                break;
                            case 'checkvisible':
                                await actionHelper.handleCheckVisible(page, step);
                                break;
                            default:
                                await actionHelper.handleAiCommand(page, step, i, test);
                                break;
                        }

                        if (step.waitAfter) {
                            await page.waitForTimeout(parseInt(step.waitAfter));
                        }
                    })();

                    // Add timeout for each step
                    await Promise.race([
                        stepPromise,
                        new Promise((_, reject) => {
                            setTimeout(() => {
                                reject(new Error(`Step ${i + 1} timed out after ${maxStepTime}ms`));
                            }, maxStepTime);
                        })
                    ]);

                } catch (stepError) {
                    await handleStepError(page, i, stepStartTime, stepError);
                    throw stepError; // Re-throw to stop test execution
                }
            }
        } catch (error) {
            console.error('Test execution failed:', error);
            throw error;
        } finally {
            await cleanup(page);
        }
    });
});