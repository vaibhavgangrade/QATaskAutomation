import { test, expect } from '@playwright/test';
import { readExcelFile } from '../../utils/excelReader.js';
import path from 'path';
import fs from 'fs';
import initialBrowserSetup from '../../utils/initialBrowserSetup.js';
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
            // Add detailed environment information
            await test.info().annotations.push({
                type: 'allure',
                description: `E2E Test Suite for ${config.domain}`,
                environment: {
                    Retailer: config.domain,
                    Browser: process.env.BROWSER || 'chromium',
                    Environment: process.env.ENV || 'QA',
                    'Test Suite': 'E2E Automation',
                    'Execution Time': new Date().toLocaleString(),
                    'Node Version': process.version,
                    'OS Platform': process.platform,
                    'Framework': 'Playwright'
                },
                severity: 'critical',
                epic: 'E2E Testing',
                feature: 'Retailer Automation',
                story: `${config.domain} Flow`,
                tags: ['e2e', config.domain, 'automation']
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
                await test.info().annotations.push({
                    type: 'testPlan',
                    description: `Total steps to execute: ${testSteps.length}`
                });
            }
        } catch (error) {
            console.error('Error in beforeAll:', error);
            await test.info().annotations.push({
                type: 'issue',
                description: `Setup Error: ${error.message}`,
                severity: 'blocker'
            });
            throw error;
        }
    });

    test.beforeEach(async ({ page }) => {
        actionHelper = new ActionHelper(page);
    });

    test('Execute Excel Steps', async ({ page, context }) => {
        try {
            page.test = test;
            const testStartTime = new Date().toISOString();
            
            // Enhanced test metadata
            await test.info().annotations.push({
                type: 'allure',
                description: `Running E2E test for ${config.domain}`,
                owner: 'QA Team',
                severity: 'critical',
                epic: 'E2E Testing',
                feature: 'Retailer Automation',
                story: `${config.domain} Flow`,
                tags: ['e2e', config.domain, 'automation'],
                startTime: testStartTime
            });

            const popupHandler = new PopupHandler(page);
            await initialBrowserSetup.setupBrowser(context);
            page.setDefaultTimeout(60000);
            page.setDefaultNavigationTimeout(60000);

            // Initial navigation with enhanced reporting
            await test.step(`Navigate to ${config.domain}`, async () => {
                const stepStart = new Date().toISOString();
                try {
                    await page.goto(`https://www.${config.domain}`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 2*60000
                    });
                    
                    const screenshot = await page.screenshot();
                    await test.info().attachments.push({
                        name: 'Initial Navigation',
                        contentType: 'image/png',
                        body: screenshot,
                        description: `Successfully navigated to ${config.domain}`
                    });

                    await test.info().annotations.push({
                        type: 'step',
                        name: 'Initial Navigation',
                        status: 'passed',
                        startTime: stepStart,
                        endTime: new Date().toISOString()
                    });
                } catch (error) {
                    await test.info().annotations.push({
                        type: 'issue',
                        description: `Navigation Error: ${error.message}`,
                        severity: 'critical',
                        startTime: stepStart,
                        endTime: new Date().toISOString()
                    });
                    throw error;
                }
            });

            for (let i = 0; i < testSteps.length; i++) {
                const stepStartTime = new Date().toISOString();
                const maxStepTime = 60000;
                const step = testSteps[i];

                await test.step(`Step ${i + 1}: ${step.action} ${step.description || ''}`, async () => {
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
                                    await actionHelper.handleAiCommand(page, step, i, test);
                                    break;
                            }

                            if (step.waitAfter) {
                                await page.waitForTimeout(parseInt(step.waitAfter));
                            }

                            // Enhanced step reporting
                            const screenshot = await page.screenshot();
                            await test.info().attachments.push({
                                name: `Step ${i + 1} - ${step.action}`,
                                contentType: 'image/png',
                                body: screenshot,
                                description: `Completed: ${step.action} ${step.description || ''}`
                            });

                            await test.info().annotations.push({
                                type: 'step',
                                name: `Step ${i + 1}: ${step.action}`,
                                status: 'passed',
                                startTime: stepStartTime,
                                endTime: new Date().toISOString(),
                                parameters: {
                                    action: step.action,
                                    description: step.description || '',
                                    value: step.value || ''
                                }
                            });
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
                        const errorScreenshot = await page.screenshot();
                        await test.info().attachments.push({
                            name: `Error - Step ${i + 1}`,
                            contentType: 'image/png',
                            body: errorScreenshot,
                            description: `Error in step: ${step.action}`
                        });
                        
                        await test.info().annotations.push({
                            type: 'issue',
                            description: `Step ${i + 1} Error: ${stepError.message}`,
                            severity: 'critical',
                            status: 'failed',
                            startTime: stepStartTime,
                            endTime: new Date().toISOString(),
                            parameters: {
                                action: step.action,
                                description: step.description || '',
                                error: stepError.message
                            }
                        });
                        throw stepError;
                    }
                });
            }

            // Add test completion annotation
            await test.info().annotations.push({
                type: 'allure',
                description: `Test completed successfully for ${config.domain}`,
                status: 'passed',
                startTime: testStartTime,
                endTime: new Date().toISOString()
            });

        } catch (error) {
            console.error('Test execution failed:', error);
            await test.info().annotations.push({
                type: 'issue',
                description: `Test Failure: ${error.message}`,
                severity: 'critical',
                status: 'failed',
                attachments: [
                    {
                        name: 'Final Error Screenshot',
                        contentType: 'image/png',
                        body: await page.screenshot()
                    },
                    {
                        name: 'Error Details',
                        contentType: 'text/plain',
                        body: Buffer.from(error.stack || error.message)
                    }
                ]
            });
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
            await test.info().annotations.push({
                type: 'issue',
                description: `Cleanup Error: ${error.message}`,
                severity: 'minor'
            });
        }
    });
});