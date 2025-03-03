import { test } from '@playwright/test';
import { setupTestData } from '../base/testSetup';
import initialBrowserSetup from '../../utils/initialBrowserSetup';
import { handleStepError, cleanup } from '../../utils/errorHandler.js';

test.describe('Navigation Tests', () => {
    test.setTimeout(120000); // 2 minutes

    let testSteps;
    let actionHelper;

    test.beforeAll(async () => {
        try {
            const setup = await setupTestData();
            testSteps = setup.testSteps.filter(step => 
                ['goto', 'scrollto'].includes(step.action.toLowerCase())
            );
            actionHelper = setup.actionHelper;
        } catch (error) {
            console.error('Error in beforeAll:', error);
            throw error;
        }
    });

    test('Execute Navigation Steps', async ({ page, context }) => {
        try {
            await initialBrowserSetup(page, context);

            for (const step of testSteps) {
                try {
                    switch (step.action.toLowerCase()) {
                        case 'goto':
                            await actionHelper.goto(page, step);
                            break;
                        case 'scrollto':
                            await actionHelper.scrollTo(page, step);
                            break;
                        default:
                            console.warn(`Unsupported navigation action: ${step.action}`);
                    }
                } catch (stepError) {
                    await handleStepError(page, step, stepError);
                }
            }
        } finally {
            await cleanup(page);
        }
    });
});