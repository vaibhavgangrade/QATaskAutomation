import fs from 'fs';
import path from 'path';

/**
 * Handles errors that occur during step execution
 */
export async function handleStepError(page, stepIndex, stepStartTime, error) {
    console.error(`Failed at step ${stepIndex + 1} after ${Date.now() - stepStartTime}ms:`, error);

    try {
        if (page && !page.isClosed()) {
            const screenshotsDir = './screenshots';
            if (!fs.existsSync(screenshotsDir)) {
                fs.mkdirSync(screenshotsDir, { recursive: true });
            }

            const timestamp = Date.now();
            const screenshotPath = path.join(
                screenshotsDir,
                `error-step-${stepIndex + 1}-${timestamp}.png`
            );

            await page.screenshot({
                path: screenshotPath,
                fullPage: true,
                timeout: 5000
            }).catch(screenshotError => {
                console.warn('Failed to capture screenshot:', screenshotError.message);
            });

            console.log(`Screenshot saved to: ${screenshotPath}`);
        }
    } catch (screenshotError) {
        console.warn('Failed to handle screenshot capture:', screenshotError.message);
    }
}

/**
 * Performs cleanup operations after test execution
 */
export async function cleanup(page) {
    try {
        if (page && !page.isClosed()) {
            await page.close().catch(error => {
                console.warn('Error closing page:', error.message);
            });
        }
    } catch (cleanupError) {
        console.warn('Cleanup failed:', cleanupError.message);
    }
}