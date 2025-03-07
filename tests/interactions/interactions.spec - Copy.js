import { test, expect } from '@playwright/test';
import { readExcelFile } from '../../utils/excelReader.js';
import path from 'path';
import fs from 'fs';
import initialBrowserSetup from '../../utils/initialBrowserSetup.js';  // Use default import
import { ActionHelper } from '../../utils/actionHelper.js';
import { handleStepError, cleanup } from '../../utils/errorHandler.js';
import PopupHandler from '../../utils/popupHandler.js';
import dotenv from 'dotenv';
import { retailerConfig } from '../../config/retailers.js';

dotenv.config();
const retailer = process.env.RETAILER || 'amazon';
const config = retailerConfig[retailer];

if (!config) {
    throw new Error(`No configuration found for retailer: ${retailer}`);
}


test.describe('Test Automation', () => {
    test.setTimeout(300000); // 5 minutes

    let testSteps;
    let actionHelper;
    let browserSetup;

    test.beforeAll(async () => {
        try {
            await test.info().annotations.push({
                type: 'environment',
                data: {
                    Retailer: config.domain,
                    Browser: process.env.BROWSER || 'chromium',
                    Environment: process.env.ENV || 'QA',
                    'Test Suite': 'E2E Automation',
                    'Execution Time': new Date().toLocaleString()
                }
            });
            const excelPath = path.join(process.cwd(), process.env.EXCEL_DIR, config.excelFile);

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

    test.beforeEach(async ({ page }) => {
        actionHelper = new ActionHelper(page);
    });

    test('Execute Excel Steps', async ({ page, context }) => {
        try {
            page.test = test;
            await test.info().annotations.push({
                type: 'description',
                description: `Running E2E test for ${config.domain}`
            });
            const popupHandler = new PopupHandler(page);
            await initialBrowserSetup.setupBrowser(context);
            page.setDefaultTimeout(60000);
            page.setDefaultNavigationTimeout(60000);

            await page.goto(`https://www.${config.domain}`, {
                waitUntil: 'domcontentloaded',
                timeout: 2*60000
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
                                await actionHelper.handleResponse(page, test, step, process.env.EXCEL_DIR, 
                                    config.apiFile);
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
                                console.log(`Executing AI command for step ${i + 1}:`, step);
                                await actionHelper.handleAiCommand(page, step, i, test);
                                break;
                        }

                        if (step.waitAfter) {
                            await page.waitForTimeout(parseInt(step.waitAfter));
                        }
                    })();

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
                    throw stepError;
                }
            }
        } catch (error) {
            console.error('Test execution failed:', error);
            throw error;
        } finally {
            await cleanup(page, context);
        }
    });

    test.afterAll(async () => {
        try {
            console.log('Starting final cleanup...');
            if (browserSetup) {
                await browserSetup.cleanup();
                browserSetup = null;
            }
            console.log('Test suite completed and cleaned up');
        } catch (error) {
            console.error('Error during final cleanup:', error);
        }
    });
});