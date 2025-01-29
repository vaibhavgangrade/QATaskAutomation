import { test, expect } from '@playwright/test';
import { ai } from '@zerostep/playwright';
import { readExcelFile, convertToAiCommand } from '../utils/excelReader';  // Add convertToAiCommand to imports
<<<<<<< HEAD
import path, { parse } from 'path';
import fs from 'fs';
import initialBrowserSetup, { setupBrowserWithStealth, setupBrowser } from '../utils/initialBrowserSetup';
import closeUnwantedPopups from '../utils/closeUnwantedPopups';
=======
import path from 'path';
import fs from 'fs';
import initialBrowserSetup, { setupBrowserWithStealth, setupBrowser } from '../utils/initialBrowserSetup';

>>>>>>> 556aab0990d0af230088553d82886a9c94ad0b9c
test.describe('Bestbuy Tests', () => {
    let testSteps;

    test.beforeAll(async () => {
        try {
            // Get the absolute path to the Excel file
            const excelPath = path.join(process.cwd(), 'testData', 'amazonSteps.xlsx');
<<<<<<< HEAD

=======
            
>>>>>>> 556aab0990d0af230088553d82886a9c94ad0b9c
            // Check if file exists
            if (!fs.existsSync(excelPath)) {
                console.error(`Excel file not found at: ${excelPath}`);
                throw new Error(`Excel file not found at: ${excelPath}`);
            }

            console.log(`Reading Excel file from: ${excelPath}`);
            testSteps = readExcelFile(excelPath);
            console.log(`Successfully loaded ${testSteps.length} steps from Excel`);
<<<<<<< HEAD

=======
            
>>>>>>> 556aab0990d0af230088553d82886a9c94ad0b9c
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
<<<<<<< HEAD

=======
>>>>>>> 556aab0990d0af230088553d82886a9c94ad0b9c
        await initialBrowserSetup.setupBrowser(context);
        await page.goto('https://www.amazon.com');

        for (let i = 0; i < testSteps.length; i++) {
            const step = testSteps[i];
            console.log(`\nExecuting step ${i + 1} of ${testSteps.length}:`, step);
<<<<<<< HEAD

=======
            
>>>>>>> 556aab0990d0af230088553d82886a9c94ad0b9c
            try {
                // Handle pre-wait
                if (step.waitBefore) {
                    await page.waitForTimeout(parseInt(step.waitBefore));
                }

                // Execute step
                if (step.action.toLowerCase() === 'goto') {
                    await page.goto(step.locator);
<<<<<<< HEAD
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
                    const page_btn = await page.$(`text=${step.locator}`);
                    await page_btn.scrollIntoViewIfNeeded();
                }

                else if (step.action.toLowerCase() === 'auto-suggest') {
                    const hasAutoSuggestion = await page
                        .waitForSelector(step.locator, {
                            state: 'visible',
                            timeout: 2000
                        })
                        .then(() => true)
                        .catch(() => false)
=======
                } else {
                    const aiCommand = convertToAiCommand(step);
                    console.log(`Executing AI command: ${aiCommand}`);
                    await ai(aiCommand, { page, test });
                }

                //Assertion
                if (step.action.toLowerCase() === 'assert') {
                    await expect(page.locator(step.locator)).toHaveText(step.value);
                }

                //wait for element to present
                if (step.action.toLowerCase() === 'elementvisible') {
                    await page.waitForTimeout(1000);
                    const verify_txt = await page.waitForSelector(`text=${step.locator}`, {
                        state: 'visible',
                        timeout: step.waitAfter ? parseInt(step.waitAfter) : 30000
                    })
                    .then(() => true)
                    .catch(() => false)
                }
                //auto suggest
                if (step.action.toLowerCase() === 'auto-suggest') {
                    const hasAutoSuggestion = await page
                    .waitForSelector(step.locator, {
                        state: 'visible',
                        timeout: 2000
                    })
                    .then(() => true)
                    .catch(() => false)
>>>>>>> 556aab0990d0af230088553d82886a9c94ad0b9c
                    if (hasAutoSuggestion) {
                        console.log('Autosuggestion found, selecting first option')
                        await page.keyboard.press('ArrowDown')
                        await page.keyboard.press('Enter')
                    }
                }

                //Input field not handled by ai() function call
<<<<<<< HEAD
                else if (step.action.toLowerCase() === 'pw-input') {
                    await page.locator(step.locator).fill(step.value)
                }

                else if (step.action.toLowerCase() === 'pw-dismissmodal') {
                    await page.keyboard.press('Escape')
                }
                // Handle ai() function call
                else {
                    const aiCommand = convertToAiCommand(step);
                    console.log(`Executing AI command: ${aiCommand}`);
                    // await waitForStableDOM(page);
                    await ai(aiCommand, { page, test });
                }


=======
                if (step.action.toLowerCase() === 'pw-input') {
                    await page.locator(step.locator).fill(step.value)
                }

>>>>>>> 556aab0990d0af230088553d82886a9c94ad0b9c
                // Handle post-wait
                if (step.waitAfter) {
                    await page.waitForTimeout(parseInt(step.waitAfter));
                }

            } catch (error) {
                console.error(`Failed at step ${i + 1}:`, error);
<<<<<<< HEAD
                await page.screenshot({
                    path: `./screenshots/error-step-${i + 1}-${Date.now()}.png`
=======
                await page.screenshot({ 
                    path: `./screenshots/error-step-${i + 1}-${Date.now()}.png` 
>>>>>>> 556aab0990d0af230088553d82886a9c94ad0b9c
                });
                throw error;
            }
        }
    });
});