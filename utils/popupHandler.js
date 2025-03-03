class PopupHandler {
    constructor(page) {
        this.page = page;
        
        // Handle browser dialogs automatically
        this.page.on('dialog', async (dialog) => {
            await dialog.accept();
            console.log('Handled browser dialog');
        });
    }

    async handleAnyPopup() {
        try {
            // Comprehensive selectors for popups and close buttons
            const selectors = {
                popups: [
                    '.modal',
                    '.popup',
                    '.dialog',
                    '[role="dialog"]',
                    '.cookie-banner',
                    '.modal-content',
                    '.modal-dialog',
                    '.overlay',
                    '#overlay',
                    '.notification',
                    '.alert',
                    '.toast',
                    '.popover',
                    '.cookie-consent',
                    '.gdpr-notice',
                    '.privacy-notice',
                    '[aria-modal="true"]',
                    '.lightbox',
                    '.drawer',
                    '.banner',
                    '.intercom-messenger',
                    '.drift-frame-controller'
                ],
                closeButtons: [
                    'button:has-text("Close")',
                    'button:has-text("×")',
                    'button:has-text("✕")',
                    'button:has-text("✖")',
                    '[aria-label="Close"]',
                    '[aria-label="Close dialog"]',
                    '[aria-label="Dismiss"]',
                    '[aria-label="Dismiss dialog"]',
                    '.close-button',
                    '.close-icon',
                    '.dismiss-button',
                    '.modal-close',
                    '.popup-close',
                    '.dialog-close',
                    '#close-dialog',
                    '.btn-close',
                    '.icon-close',
                    'button:has-text("Accept")',
                    'button:has-text("Accept All")',
                    'button:has-text("Allow")',
                    'button:has-text("Got it")',
                    'button:has-text("I understand")',
                    'button:has-text("No thanks")',
                    'button:has-text("Maybe later")',
                    'button:has-text("Dismiss")',
                    'button:has-text("Skip")',
                    'button:has-text("Continue")',
                    'button:has-text("Proceed")',
                    'button:has-text("OK")',
                    'button:has-text("Done")',
                    '.cookie-accept',
                    '.cookie-close',
                    '.gdpr-accept',
                    '.consent-accept',
                    '[title="Close"]',
                    '[data-dismiss="modal"]',
                    '.intercom-messenger-close-button',
                    '.drift-widget-close-button'
                ]
            };

            // Look for any visible popup
            for (const popupSelector of selectors.popups) {
                const popup = await this.page.$(popupSelector);
                if (!popup || !await popup.isVisible()) continue;

                console.log(`Found popup: ${popupSelector}`);

                // Try each close button
                for (const closeSelector of selectors.closeButtons) {
                    try {
                        const closeButton = await popup.$(closeSelector);
                        if (closeButton && await closeButton.isVisible()) {
                            await closeButton.click();
                            console.log('Successfully closed popup');
                            return true;
                        }
                    } catch (error) {
                        continue;
                    }
                }

                // If no close button worked, try clicking the popup itself
                try {
                    await popup.click();
                    console.log('Clicked popup directly');
                    return true;
                } catch (error) {
                    console.debug('Failed to close popup:', error.message);
                }
            }

            return false;
        } catch (error) {
            console.warn('Popup handler warning:', error.message);
            return false;
        }
    }
}

module.exports = PopupHandler;