export async function executeStep(step, page, test) {
    try {
        const aiCommand = convertToAiCommand(step);
        console.log(`Executing step: ${JSON.stringify(step)}`);
        console.log(`AI Command: ${aiCommand}`);

        // Pre-wait
        if (step.waitBefore) {
            console.log(`Waiting before step: ${step.waitBefore}ms`);
            await page.waitForTimeout(parseInt(step.waitBefore));
        }

        // Execute command
        await ai(aiCommand, { page, test });

        // Post-wait
        if (step.waitAfter) {
            console.log(`Waiting after step: ${step.waitAfter}ms`);
            await page.waitForTimeout(parseInt(step.waitAfter));
        }

        console.log('Step completed successfully');
    } catch (error) {
        console.error(`Failed to execute step: ${JSON.stringify(step)}`);
        console.error(`Error: ${error.message}`);
        
        // Take screenshot on failure
        await page.screenshot({ 
            path: `./screenshots/error-${Date.now()}.png`,
            fullPage: true 
        });
        
        throw error;
    }
}