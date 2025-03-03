import { test, expect } from '@playwright/test';
import { readExcelFile } from '../../utils/excelReader';
import path from 'path';
import fs from 'fs';
import initialBrowserSetup from '../../utils/initialBrowserSetup';
import { ActionHelper } from '../../utils/actionHelper.js';
import { handleStepError, cleanup } from '../../utils/errorHandler.js';
import PopupHandler from '../../utils/popupHandler.js';  // Update import to get the class
import dotenv from 'dotenv';

dotenv.config();

test.describe('Test Automation', () => {
    test.setTimeout(300000); // 5 minutes

    let testSteps;
    let actionHelper;
    let browserSetup;

    test.beforeAll(async () => {
        try {
            actionHelper = new ActionHelper();

            // Get path from env variable
            const excelPath = path.join(process.cwd(), process.env.EXCEL_DIR, process.env.EXCEL_FILE);

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
            page.test = test;
            const popupHandler = new PopupHandler(page);  // Create instance at the start
            await initialBrowserSetup.setupBrowser(context); // Fixed typo from 'contextaa'
            page.setDefaultTimeout(60000);
            page.setDefaultNavigationTimeout(60000);

            await page.goto('https://'+process.env.retname+'.com', {
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
                                // await popupHandler.handleAnyPopup().catch(error => {
                                //     console.warn('Popup handling warning:', error.message);
                                // });
                                break;
                            case 'assert':
                                await actionHelper.handleAssert(page, step);
                                break;
                            case 'request':
                                await actionHelper.handleRequest(step, 0);
                                break;
                            case 'response':
                                await actionHelper.handleResponse(page, test, step, process.env.api_dir, process.env.api_file);
                                break;
                            case 'scrollto':
                                await actionHelper.handleScrollTo(page, step);
                                // await popupHandler.handleAnyPopup().catch(error => {
                                //     console.warn('Popup handling warning:', error.message);
                                // });
                                break;
                            case 'clickto':
                                await actionHelper.handleClickTo(page, step);
                                // await popupHandler.handleAnyPopup().catch(error => {
                                //     console.warn('Popup handling warning:', error.message);
                                // });  // Use the instance method
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
                            case 'oauthclick':
                                page.on('request', request => {
                                    if (request.url().includes('auth')) {
                                        console.log('Auth Request:', {
                                            url: request.url(),
                                            headers: request.headers()
                                        });
                                    }
                                });
                                await actionHelper.handleOAuthClick(page, step);
                                break;
                            case 'checkvisible':
                                await actionHelper.handleCheckVisible(page, step);
                                break;
                            case 'fileupload':
                                await actionHelper.handleFileUpload(page, step);
                                break;
                            case 'apirequest':
                                await actionHelper.handleRequest(step);
                                break;
                            case 'apiresponse':
                                await actionHelper.handleResponse(page, test, step, process.env.api_dir, process.env.api_file);
                                break;
                            default:
                                console.log(`Executing AI command for step ${i + 1}:`, step);
                                await actionHelper.handleAiCommand(page, step, i, test);
                                // await popupHandler.handleAnyPopup().catch(error => {
                                //     console.warn('Popup handling warning:', error.message);
                                // });
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
            testSteps = null;
            actionHelper = null;

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