async function findElementByText(page, text) {
    try {
        console.log('Looking for element with text:', text);

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
            `*:has-text("${text}")`
        ];

        for (const selector of selectors) {
            try {
                const element = page.locator(selector);
                const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);

                if (isVisible) {
                    console.log('Found element using selector:', selector);
                    return element.first();
                }
            } catch (error) {
                continue;
            }
        }

        // Fuzzy matching
        const fuzzySelectors = [
            `text=${text}i`,
            `*:has-text("${text}", "i")`
        ];

        for (const selector of fuzzySelectors) {
            try {
                const element = page.locator(selector);
                const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);

                if (isVisible) {
                    console.log('Found element using fuzzy selector:', selector);
                    return element.first();
                }
            } catch (error) {
                continue;
            }
        }

        throw new Error(`Could not find element containing text: ${text}`);
    } catch (error) {
        console.error('Error finding element:', error.message);
        throw error;
    }
}

async function getListValues(page, locator) {
    try {
        const element = page.locator(locator);
        await expect(element).toBeVisible({ timeout: 5000 });
        
        // Get text content and split by newline
        const text = await element.textContent();
        const values = text.split('\n')
                          .map(item => item.trim())
                          .filter(item => item !== '');
        
        console.log(`Found ${values.length} items:`, values);
        return values;
    } catch (error) {
        console.error('Error getting list values:', error.message);
        throw error;
    }
}

module.exports = {
    findElementByText,
    getListValues
};