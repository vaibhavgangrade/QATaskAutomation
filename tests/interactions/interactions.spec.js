import { test } from '@playwright/test';
import { readExcelFile } from '../../utils/excelReader.js';
import path from 'path';
import fs from 'fs';
import { ActionHelper } from '../../utils/actionHelper.js';
import dotenv from 'dotenv';
import { retailerConfig } from '../../config/retailers.js';

dotenv.config();
const retailer = process.env.RETAILER || 'amazon';
const config = retailerConfig[retailer];

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

test.describe('Test Automation Suite', () => {
    test.setTimeout(300000);

    // Add test execution statistics
    const executionStats = {
        totalSteps: 0,
        playwrightSteps: 0,
        zerostepSteps: 0,
        failedSteps: 0
    };

    test.afterAll(async () => {
        // Log final execution statistics
        test.info().annotations.push({
            type: 'Execution Statistics',
            description: `
                Total Steps: ${executionStats.totalSteps}
                Playwright Steps: ${executionStats.playwrightSteps}
                Zerostep Steps: ${executionStats.zerostepSteps}
                Failed Steps: ${executionStats.failedSteps}
            `
        });
    });


    // Create a test for each test case
    Object.entries(testCases).forEach(([testId, steps]) => {
        test(`Test Case: ${testId}`, async ({ page }) => {
            const actionHelper = new ActionHelper(page);

            try {
                await page.goto(`https://www.${config.domain}`, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });

                for (const step of steps) {
                    await test.step(`${step.action}`, async () => {
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
                            case 'elementinputdata':
                                try {
                                    await actionHelper.handleInputData(page, step, test);
                                    executionStats.playwrightSteps++;
                                } catch (error) {
                                    // If handleInputData used Zerostep as fallback successfully
                                    if (error.message?.includes('Zerostep fallback')) {
                                        executionStats.zerostepSteps++;
                                    } else {
                                        executionStats.failedSteps++;
                                        throw error;
                                    }
                                }
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
                            case 'elementclick':
                                try {
                                    await actionHelper.handleTextBasedClick(page, step, test);
                                    executionStats.playwrightSteps++;
                                } catch (error) {
                                    // If handleTextBasedClick used Zerostep as fallback successfully
                                    if (error.message?.includes('Zerostep fallback')) {
                                        executionStats.zerostepSteps++;
                                    } else {
                                        executionStats.failedSteps++;
                                        throw error;
                                    }
                                }
                                break;
                            default:
                                await actionHelper.handleAiCommand(page, step, test);
                                executionStats.zerostepSteps++;
                                break;

                        }

                        if (step.waitAfter) {
                            await page.waitForTimeout(parseInt(step.waitAfter));
                        }

                        await page.screenshot({
                            path: `./screenshots/${testId}_${step.action}_success.png`
                        });
                    });
                }
            } catch (error) {
                console.error(`Test Case ${testId} failed:`, error);
                executionStats.failedSteps++;
                await page.screenshot({
                    path: `./screenshots/${testId}_error.png`
                });
                throw error;
            }
        });
    });
});