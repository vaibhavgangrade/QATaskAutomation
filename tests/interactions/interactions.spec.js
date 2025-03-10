import { test } from '@playwright/test';
import { readExcelFile } from '../../utils/excelReader.js';
import path from 'path';
import fs from 'fs';
import initialBrowserSetup from '../../utils/initialBrowserSetup.js';
import { ActionHelper } from '../../utils/actionHelper.js';
import { cleanup } from '../../utils/errorHandler.js';
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
    test.setTimeout(300000);
    let testSteps;
    let actionHelper;
    let currentPage;

    test.beforeAll(async () => {
        try {
            const excelPath = path.join(process.cwd(), process.env.EXCEL_DIR, config.excelFile);
            if (!fs.existsSync(excelPath)) {
                throw new Error(`Excel file not found at: ${excelPath}`);
            }
            testSteps = readExcelFile(excelPath);
            console.log(`Loaded ${testSteps.length} steps from Excel`);
        } catch (error) {
            console.error('Setup Error:', error.message);
            throw error;
        }
    });

    test.beforeEach(async ({ page }) => {
        actionHelper = new ActionHelper(page);
    });

    test('Execute Excel Steps', async ({ page, context }) => {
        try {
            page.test = test;
            await initialBrowserSetup.setupBrowser(context);
            
            // Initial navigation
            await page.goto(`https://www.${config.domain}`, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            // Execute test steps
            for (let i = 0; i < testSteps.length; i++) {
                if (page.isClosed()) {
                    page = await context.newPage();
                    actionHelper = new ActionHelper(page);
                }

                const step = testSteps[i];
                await test.step(`Step ${i + 1}: ${step.action}`, async () => {
                    try {
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

                    } catch (error) {
                        console.log(`Step ${i + 1} failed: ${error?.message ?? 'Unknown error'}`);
                        throw error;
                    }
                });
            }
        } catch (error) {
            throw error;
        } finally {
            if (!page.isClosed()) {
                await cleanup(page, context);
            }
        }
    });
});