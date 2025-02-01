import { test, expect } from '@playwright/test';
import { ai } from '@zerostep/playwright';
import { readExcelFile, convertToAiCommand, getValueFromJson } from '../utils/excelReader';  // Add convertToAiCommand to imports
import path, { parse } from 'path';
import fs from 'fs';
import initialBrowserSetup, { setupBrowserWithStealth, setupBrowser } from '../utils/initialBrowserSetup';
import axios from 'axios';  // Add this import

test.describe('Test Automation', () => {
    let testSteps;
    let networkLogs = []

    test.beforeAll(async () => {
        try {
            // Get the absolute path to the Excel file
            const excelPath = path.join(process.cwd(), 'testData', 'iApp.xlsx');

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

        // await initialBrowserSetup.setupBrowser(context);
        // await page.goto('https://www.amazon.com');

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

                else if (step.action.toLowerCase() === 'request') {
                    try {
                        // Log request details before making the call
                        console.log('Making API request:', {
                            url: step.locator,
                            method: step.method || 'POST',
                            headers: step.headers,
                            body: step.value
                        });

                        const url = step.locator.startsWith('http') ? step.locator : `https://${step.locator}`; const response = await axios({
                            method: step.method || 'POST',
                            url: url,
                            data: step.value ? JSON.parse(step.value) : undefined,
                            headers: step.headers || {
                                'Content-Type': 'application/json'
                            },
                            validateStatus: function (status) {
                                // Log all responses, don't throw error for non-200 status
                                return true;
                            }
                        });

                        // Log response details
                        console.log('API Response:', {
                            status: response.status,
                            statusText: response.statusText,
                            data: response.data
                        });

                        networkLogs.push({
                            timestamp: new Date().toISOString(),
                            step: i + 1,
                            request: {
                                url: url,
                                method: step.method || 'POST',
                                headers: step.headers,
                                body: step.value
                            },
                            response: {
                                status: response.status,
                                statusText: response.statusText,
                                headers: response.headers,
                                data: response.data
                            }
                        });


                    } catch (error) {
                        console.error('API Request failed:', {
                            url: step.locator,
                            method: step.method || 'POST',
                            error: error.message,
                            response: error.response?.data
                        });

                        networkLogs.push({
                            timestamp: new Date().toISOString(),
                            step: i + 1,
                            request: {
                                url: step.locator,
                                method: step.method || 'POST',
                                headers: step.headers,
                                body: step.value
                            },
                            error: {
                                message: error.message,
                                status: error.response?.status,
                                statusText: error.response?.statusText,
                                data: error.response?.data
                            }
                        });
                        throw error;
                    }
                    const logsDir = path.join(process.cwd(), 'test-results');
                    if (!fs.existsSync(logsDir)) {
                        fs.mkdirSync(logsDir, { recursive: true });
                    }

                    fs.writeFileSync(
                        path.join(logsDir, 'last-run.json'),
                        JSON.stringify({ networkLogs: networkLogs }, null, 2)
                    );
                }

                else if (step.action.toLowerCase() === 'response') {
                    const filePath = path.join(process.cwd(), 'test-results', 'last-run.json');

                    // Read specific values
                    const token = getValueFromJson(filePath, 'networkLogs.0.response.data.token');
                    console.log('Token:', token);

                    const status = getValueFromJson(filePath, 'networkLogs.0.response.status');
                    console.log('Status:', status);

                    const url = getValueFromJson(filePath, 'networkLogs.0.request.url');
                    console.log('URL:', url);
                    await ai(`Enter the '${token}' into '${step.locator}'`,  { page, test });
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
        // After the test, save the logs
   
    });
});