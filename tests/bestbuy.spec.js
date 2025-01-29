import { test, expect } from '@playwright/test';
import { ai } from '@zerostep/playwright';
import { readExcelFile, convertToAiCommand } from '../utils/excelReader';  // Add convertToAiCommand to imports
import path, { parse } from 'path';
import fs from 'fs';
import initialBrowserSetup, { setupBrowserWithStealth, setupBrowser } from '../utils/initialBrowserSetup';
test.describe('Bestbuy Tests', () => {
    let testSteps;

    test.beforeAll(async () => {
        try {
            // Get the absolute path to the Excel file
            const excelPath = path.join(process.cwd(), 'testData', 'amazonSteps.xlsx');

            // Check if file exists
            if (!fs.existsSync(excelPath)) {
                console.error(`Excel file not found at: ${excelPath}`);
                throw new Error(`Excel file not found at: ${excelPath}`);
            }

            console.log(`Reading Excel file from: ${excelPath}`);
            testSteps = readExcelFile(excelPath);
            console.log(`Successfully loaded ${testSteps.length} steps from Excel`);

            // Log the first step as a sample
            if (testSteps.length > 0) {
                console.log('Sample step:', testSteps[0]);
            }

        } catch (error) {
            console.error('Error in beforeAll:', error);
            throw error;
        }
    });

    test('Execute Excel Steps', async ({ page, context }) => {

        await initialBrowserSetup.setupBrowser(context);
        await page.goto('https://www.amazon.com');

        for (let i = 0; i < testSteps.length; i++) {
            const step = testSteps[i];
            console.log(`\nExecuting step ${i + 1} of ${testSteps.length}:`, step);

            try {
                // Handle pre-wait
                if (step.waitBefore) {
                    await page.waitForTimeout(parseInt(step.waitBefore));
                }

                // Execute step
                if (step.action.toLowerCase() === 'goto') {
                    await page.goto(step.locator);
                    await Promise.all([
                        page.waitForLoadState('domcontentloaded'),
                        page.waitForLoadState('load')
                    ]);
                }
                //Assertion
                else if (step.action.toLowerCase() === 'assert') {
                    await expect(page.locator(step.locator)).toHaveText(step.value);
                }

                else if (step.action.toLowerCase() === 'scrollto') {
                    try {
                        const page_btn = await page.$(`text=${step.locator}`);
                        await page_btn.scrollIntoViewIfNeeded();
                        await expect(page_btn).toBeVisible({ timeout: 5000 });
                    } catch (error) {
                        const alternativeSelectors = [
                            `[aria-label*="${step.locator}"]`,
                            `[title*="${step.locator}"]`,
                            `button:has-text("${step.locator}")`,
                            `a:has-text("${step.locator}")`,
                            `div:has-text("${step.locator}")`,
                            `span:has-text("${step.locator}")`,
                            `label:has-text("${step.locator}")`,
                            `input:has-text("${step.locator}")`
                        ];
                        let elementFound = false;
                        for (const selector of alternativeSelectors) {
                            try {
                                const element = await page.locator(selector).first();
                                await element.scrollIntoViewIfNeeded();
                                await expect(element).toBeVisible({ timeout: 5000 });
                                elementFound = true;
                                break;
                            } catch {
                                continue;
                            }
                        }
                    }
                }

                // Handle ai() function call
                else {
                    const aiCommand = convertToAiCommand(step);
                    console.log(`Executing AI command: ${aiCommand}`);
                    // await waitForStableDOM(page);
                    await ai(aiCommand, { page, test });
                }


                // Handle post-wait
                if (step.waitAfter) {
                    await page.waitForTimeout(parseInt(step.waitAfter));
                }

            } catch (error) {
                console.error(`Failed at step ${i + 1}:`, error);
                await page.screenshot({
                    path: `./screenshots/error-step-${i + 1}-${Date.now()}.png`
                });
                throw error;
            }
        }
    });
});