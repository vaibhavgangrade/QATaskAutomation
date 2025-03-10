import { ai } from '@zerostep/playwright';
import { expect } from '@playwright/test';
import { convertToAiCommand } from './excelReader.js';

export class ActionHelper {
    async handleGoto(page, step) {
        try {
            const response = await page.goto(step.locator, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            if (!response?.ok()) {
                throw new Error(`Navigation failed: ${response?.status() || 'no response'}`);
            }
        } catch (error) {
            throw error;
        }
    }

    async handleAssert(page, step) {
        try {
            if (page.isClosed()) return;

            const element = await page.locator(step.locator);
            await element.waitFor({ state: 'visible', timeout: 30000 });

            await expect(element).toContainText(step.value, {
                timeout: 30000,
                ignoreCase: true
            });

            if (!page.isClosed()) {
                await page.test.info().attachments.push({
                    name: 'Assertion Success',
                    contentType: 'image/png',
                    body: await page.screenshot({ fullPage: false }),
                    description: `✅ Found text: "${step.value}"`
                });
            }
        } catch (error) {
            if (!page.isClosed()) {
                await page.test.info().attachments.push({
                    name: 'Assertion Error',
                    contentType: 'image/png',
                    body: await page.screenshot({ fullPage: false }),
                    description: `❌ Text not found: "${step.value}"`
                });
            }
            throw error;
        }
    }

    async handleAiCommand(page, step, i, test) {
        try {
            // await test.info().annotations.push({
            //     type: 'step',
            //     name: `Step ${i + 1}: ${step.action}`,
            //     status: 'running'
            // });

            const aiCommand = convertToAiCommand(step);
            await ai(aiCommand, { page, test });

            if (!page.isClosed()) {
                await test.info().attachments.push({
                    name: `Step ${i + 1}`,
                    contentType: 'image/png',
                    body: await page.screenshot({ fullPage: false })
                });
            }
        } catch (error) {
            if (!error.message.includes('Target page') && !page.isClosed()) {
                await test.info().attachments.push({
                    name: `Error-${i + 1}`,
                    contentType: 'image/png',
                    body: await page.screenshot({ fullPage: false })
                });
                
                await test.info().annotations.push({
                    type: 'issue',
                    description: `Step ${i + 1} Error: ${error.message}`,
                    status: 'failed'
                });
            }
            throw error;
        }
    }

    async handleFillData(page, step) {
        try {
            const element = await page.locator(step.locator);
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await element.fill(step.value);
        } catch (error) {
            throw error;
        }
    }

    async handleClickTo(page, step) {
        try {
            const element = await page.locator(`text=${step.locator}`).first();
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await element.click({ timeout: 5000 });
        } catch (error) {
            throw error;
        }
    }

    async handleClickLoc(page, step) {
        try {
            const element = await page.locator(step.locator);
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await element.click({ timeout: 5000, force: true });
        } catch (error) {
            throw error;
        }
    }

    async handleCheckVisible(page, step) {
        try {
            const element = await page.locator(`text=${step.locator}`);
            await element.waitFor({ state: 'visible', timeout: 30000 });
        } catch (error) {
            throw error;
        }
    }

    async handleScrollTo(page, step) {
        try {
            const element = await page.locator(`text=${step.locator}`).first();
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await element.scrollIntoViewIfNeeded();
        } catch (error) {
            throw error;
        }
    }

    async handlePressKey(page, step) {
        try {
            const element = await page.locator(step.locator);
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await element.press(step.value);
        } catch (error) {
            throw error;
        }
    }
}