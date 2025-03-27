async function closeUnwantedPopups(page) {
    try {

        // Common popup patterns
        const popupPatterns = [
            // iframes (like chat widgets)
            async () => {
                const frames = page.frames();
                for (const frame of frames) {
                    try {
                        const closeButton = await frame.$('[aria-label="Close"]');
                        if (closeButton) await closeButton.click();
                    } catch (e) { }
                }
            },

            // Cookie consent popups
            async () => {
                const cookieSelectors = [
                    'button:has-text("Accept Cookies")',
                    'button:has-text("Accept All")',
                    'button:has-text("Allow All")',
                    'button:has-text("Allow Cookies")',
                    '[aria-label="Accept cookies"]',
                    '#onetrust-accept-btn-handler',
                    '.cookie-accept',
                    '[data-testid="cookie-accept"]'
                ];
                for (const selector of cookieSelectors) {
                    if (await page.$(selector)) {
                        await page.click(selector).catch(() => {});
                    }
                }
            },

            // Newsletter/subscription popups
            async () => {
                const closeSelectors = [
                    // Close buttons
                    'button[aria-label="Close"]',
                    '[aria-label="Close dialog"]',
                    'button.close',
                    '.modal-close',
                    '.popup-close',
                    '.closeButton',
                    '#close-button',
                    
                    // X symbols
                    'button:has-text("✕")',
                    'button:has-text("×")',
                    'button:has-text("X")',
                    
                    // Common text buttons
                    'button:has-text("Close")',
                    'button:has-text("No Thanks")',
                    'button:has-text("Not Now")',
                    'button:has-text("Maybe Later")',
                    'button:has-text("Dismiss")',
                    'button:has-text("Reject All")',
                    
                    // Common popup classes
                    '.modal button',
                    '.popup button',
                    '.dialog button',
                    '[class*="modal"] button',
                    '[class*="popup"] button',
                    '[class*="dialog"] button'
                ];

                for (const selector of closeSelectors) {
                    const elements = await page.$$(selector);
                    for (const element of elements) {
                        if (await element.isVisible()) {
                            await element.click().catch(() => {});
                            await page.waitForTimeout(300);
                        }
                    }
                }
            },

            // Handle overlay clicks
            async () => {
                const overlaySelectors = [
                    '.modal-backdrop',
                    '.overlay',
                    '[class*="modal-backdrop"]',
                    '[class*="overlay"]'
                ];

                for (const selector of overlaySelectors) {
                    const overlay = await page.$(selector);
                    if (overlay && await overlay.isVisible()) {
                        await overlay.click({ position: { x: 0, y: 0 } }).catch(() => {});
                    }
                }
            },

            // Press Escape key as last resort
            async () => {
                await page.keyboard.press('Escape');
                await page.waitForTimeout(300);
            }
        ];

        // Execute all popup closing patterns
        for (const pattern of popupPatterns) {
            await pattern().catch(() => {});
        }

    } catch (error) {
        console.log('Error handling popups:', error);
    }
}
export default closeUnwantedPopups;