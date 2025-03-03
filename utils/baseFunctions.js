async function findElementByText(page, text) {
    try {
        console.log(`Looking for element with text: "${text}"`);
        
        // Common text-based selectors in order of preference
        const selectors = [
            // Exact matches
            `text="${text}"`,
            `[aria-label="${text}"]`,
            `[placeholder="${text}"]`,
            `[title="${text}"]`,
            
            // Contains matches
            `text=${text}`,
            `[aria-label*="${text}"]`,
            `[placeholder*="${text}"]`,
            `[title*="${text}"]`,
            
            // Common elements with text
            `button:has-text("${text}")`,
            `input:has-text("${text}")`,
            `a:has-text("${text}")`,
            `label:has-text("${text}")`,
            `div:has-text("${text}")`,
            `span:has-text("${text}")`,
            `p:has-text("${text}")`,
            `h1:has-text("${text}")`,
            `h2:has-text("${text}")`,
            `h3:has-text("${text}")`,
            `h4:has-text("${text}")`,
            `input:has(span:text("${text}"))`,
            `span:has(input:has(span:text("${text}")))`,
            // Fallback to any element containing the text
            `*:has-text("${text}")`
        ];

        // Try each selector
        for (const selector of selectors) {
            try {
                const element = page.locator(selector);
                const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);
                // const count = await element.count();
                
                if (isVisible) {
                    console.log(`Found element using selector: ${selector}`);
                    return element.first();
                }
            } catch (error) {
                continue;
            }
        }

        // If no exact matches found, try case-insensitive and partial matches
        const fuzzySelectors = [
            `text=${text}i`,  // case-insensitive
            `*:has-text("${text}", "i")`,  // case-insensitive
            // Add more fuzzy matching strategies if needed
        ];

        for (const selector of fuzzySelectors) {
            try {
                const element = page.locator(selector);
                const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
                // const count = await element.count();
                
                if (isVisible) {
                    console.log(`Found element using fuzzy selector: ${selector}`);
                    return element.first();
                }
            } catch (error) {
                continue;
            }
        }

        throw new Error(`Could not find any element containing text: ${text}`);
    } catch (error) {
        console.error(`Error finding element with text "${text}":`, error);
        throw error;
    }
}

// Example usage in your test:
// const element = await findElementByText(page, "Login");
// await element.click();

module.exports = {
    findElementByText
};

