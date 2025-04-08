// Advanced antibot handling techniques
import { Page } from '@playwright/test';

/**
 * Anti-bot challenge handler specialized for e-commerce sites
 */
export class AntibotHandler {
    /**
     * Creates a new antibot handler
     * @param {Page} page - The Playwright page object
     */
    constructor(page) {
        this.page = page;
        this.challengeDetected = false;
    }

    /**
     * Detects and handles common antibot challenges
     * @returns {Promise<boolean>} True if challenge was detected and handled
     */
    async handleAntibotChallenge() {
        try {
            // Check for common challenge patterns
            const hasChallenge = await this.detectChallenge();
            if (!hasChallenge) {
                return false;
            }

            console.log('👮 Anti-bot challenge detected!');
            this.challengeDetected = true;

            // Apply evasion techniques
            await this.applyEvasionTechniques();
            
            // Wait for challenge to complete
            await this.waitForChallengeResolution();

            return true;
        } catch (error) {
            console.error('Error handling antibot challenge:', error);
            return false;
        }
    }

    /**
     * Detects if an antibot challenge is present
     * @returns {Promise<boolean>}
     */
    async detectChallenge() {
        try {
            // Check for known bot challenge indicators with timeout
            const checks = await Promise.all([
                this.page.locator('iframe[title*="challenge"]').isVisible({ timeout: 3000 }).catch(() => false),
                this.page.locator('iframe[src*="captcha"]').isVisible({ timeout: 3000 }).catch(() => false),
                this.page.locator('iframe[src*="cloudflare"]').isVisible({ timeout: 3000 }).catch(() => false),
                this.page.locator('iframe[src*="distil"]').isVisible({ timeout: 3000 }).catch(() => false),
                this.page.locator('iframe[src*="imperva"]').isVisible({ timeout: 3000 }).catch(() => false),
                this.page.locator('iframe[src*="akamai"]').isVisible({ timeout: 3000 }).catch(() => false),
                this.page.locator('iframe[src*="datadome"]').isVisible({ timeout: 3000 }).catch(() => false),
                this.page.locator('text=Verify you are human').isVisible({ timeout: 3000 }).catch(() => false),
                this.page.locator('text=Just a moment...').isVisible({ timeout: 3000 }).catch(() => false),
                this.page.locator('text=Please wait while we verify').isVisible({ timeout: 3000 }).catch(() => false),
                this.page.locator('#challenge-running').isVisible({ timeout: 3000 }).catch(() => false),
                this.page.locator('#js_info').isVisible({ timeout: 3000 }).catch(() => false)
            ]);

            return checks.some(result => result === true);
        } catch (error) {
            console.warn('Challenge detection error:', error);
            return false;
        }
    }

    /**
     * Apply various evasion techniques to help pass the challenge
     */
    async applyEvasionTechniques() {
        try {
            // Human-like cursor movements
            await this.simulateRandomMouseMovements();
            
            // User-like scrolling behavior
            await this.simulateScrolling();
            
            // Inject advanced fingerprint resistances
            await this.injectAdvancedFingerprinting();
            
            // Make the page think we're not in automation
            await this.page.evaluate(() => {
                // Override automation properties
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                
                // Hide automation variables
                if (window.cdc_adoQpoasnfa76pfcZLmcfl_Array) {
                    window.cdc_adoQpoasnfa76pfcZLmcfl_Array = undefined;
                }
                
                if (window.cdc_adoQpoasnfa76pfcZLmcfl_Promise) {
                    window.cdc_adoQpoasnfa76pfcZLmcfl_Promise = undefined;
                }
                
                if (window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol) {
                    window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol = undefined;
                }
            });
        } catch (error) {
            console.warn('Error applying evasion techniques:', error);
        }
    }

    /**
     * Simulates random realistic mouse movements
     */
    async simulateRandomMouseMovements() {
        try {
            // Get viewport dimensions
            const viewportSize = this.page.viewportSize();
            if (!viewportSize) return;

            await this.page.mouse.move(
                viewportSize.width / 2,
                viewportSize.height / 2
            );

            // Create random movements
            for (let i = 0; i < 5; i++) {
                const x = Math.floor(Math.random() * viewportSize.width);
                const y = Math.floor(Math.random() * viewportSize.height);
                
                // Move in a human-like way with delay
                await this.page.mouse.move(x, y, { steps: 10 });
                await this.page.waitForTimeout(Math.random() * 300 + 100);
            }

            // Random clicks can sometimes help with challenges
            if (Math.random() > 0.7) {
                // Click far from any interactive element
                const x = 20 + Math.floor(Math.random() * 50);
                const y = 20 + Math.floor(Math.random() * 50);
                await this.page.mouse.click(x, y);
            }
        } catch (error) {
            console.warn('Mouse movement simulation error:', error);
        }
    }

    /**
     * Simulates natural scrolling behaviors
     */
    async simulateScrolling() {
        try {
            // Natural scrolling behavior
            await this.page.evaluate(() => {
                return new Promise(resolve => {
                    let totalScrolls = 2 + Math.floor(Math.random() * 3); // 2-4 scrolls
                    let scrollsCompleted = 0;
                    
                    const scrollDown = () => {
                        if (scrollsCompleted >= totalScrolls) {
                            resolve();
                            return;
                        }
                        
                        const scrollAmount = 100 + Math.floor(Math.random() * 300);
                        window.scrollBy({
                            top: scrollAmount,
                            behavior: 'smooth'
                        });
                        
                        scrollsCompleted++;
                        setTimeout(scrollDown, 500 + Math.random() * 1000);
                    };
                    
                    scrollDown();
                });
            });
        } catch (error) {
            console.warn('Scrolling simulation error:', error);
        }
    }

    /**
     * Injects advanced fingerprinting protections
     */
    async injectAdvancedFingerprinting() {
        await this.page.evaluate(() => {
            // Add fingerpring randomization
            // Create a random offset to be applied to size measurements
            const sizeOffset = Math.floor(Math.random() * 10) - 5; // -5 to +5 pixels
            
            // Override canvas fingerprinting
            const originalGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function() {
                const context = originalGetContext.apply(this, arguments);
                if (arguments[0] === '2d') {
                    const originalGetImageData = context.getImageData;
                    context.getImageData = function() {
                        const imageData = originalGetImageData.apply(this, arguments);
                        // Subtly modify the image data
                        for (let i = 0; i < imageData.data.length; i += 4) {
                            // Small random modification to red/green/blue channels
                            imageData.data[i] = (imageData.data[i] + Math.floor(Math.random() * 2)) % 256;
                            imageData.data[i+1] = (imageData.data[i+1] + Math.floor(Math.random() * 2)) % 256;
                            imageData.data[i+2] = (imageData.data[i+2] + Math.floor(Math.random() * 2)) % 256;
                        }
                        return imageData;
                    };
                    
                    // Modify text metrics
                    const originalMeasureText = context.measureText;
                    context.measureText = function(text) {
                        const metrics = originalMeasureText.apply(this, arguments);
                        
                        // Add small random variations to metrics
                        const originalWidth = metrics.width;
                        Object.defineProperty(metrics, 'width', {
                            get: function() {
                                return originalWidth + (Math.random() * 0.2 - 0.1);
                            }
                        });
                        
                        return metrics;
                    };
                }
                return context;
            };
            
            // Override WebGL fingerprinting
            const getParameterProxied = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                // RENDERER and VENDOR are often used for fingerprinting
                if (parameter === 37446) { // RENDERER
                    return `ANGLE (Intel, Intel(R) UHD Graphics ${Math.floor(Math.random() * 1000)}, OpenGL 4.1)`;
                }
                if (parameter === 37445) { // VENDOR
                    return `Google Inc. (Intel)`;
                }
                // For any other parameter, use the default
                return getParameterProxied.apply(this, [parameter]);
            };
            
            // Randomize audio fingerprinting
            if (window.AudioContext) {
                const OriginalAudioContext = window.AudioContext;
                window.AudioContext = function() {
                    const context = new OriginalAudioContext();
                    const originalCreateOscillator = context.createOscillator;
                    context.createOscillator = function() {
                        const oscillator = originalCreateOscillator.apply(this, arguments);
                        const originalGetFrequency = oscillator.frequency.value;
                        Object.defineProperty(oscillator.frequency, 'value', {
                            get: function() {
                                return originalGetFrequency + (Math.random() * 0.01 - 0.005);
                            }
                        });
                        return oscillator;
                    };
                    return context;
                };
            }
        });
    }

    /**
     * Waits for challenge resolution with adaptive waiting
     */
    async waitForChallengeResolution() {
        try {
            console.log('Waiting for challenge resolution...');
            
            // Initial observation period
            await this.page.waitForTimeout(3000);
            
            // Check if challenge elements are still present
            const stillHasChallenge = await this.detectChallenge();
            
            if (stillHasChallenge) {
                console.log('Challenge still active, waiting longer...');
                
                // Try clicking if there's a verification button
                const verifyButtons = [
                    'button:has-text("Verify")',
                    'button:has-text("Continue")',
                    'button:has-text("I am human")',
                    '[type="submit"]:visible'
                ];
                
                for (const selector of verifyButtons) {
                    const hasButton = await this.page.locator(selector).isVisible().catch(() => false);
                    if (hasButton) {
                        console.log(`Clicking verification button: ${selector}`);
                        await this.page.locator(selector).click().catch(() => {});
                        break;
                    }
                }
                
                // Extended wait with conditional exit
                const maxWaitTime = 30000; // 30 seconds max
                const startTime = Date.now();
                
                while (Date.now() - startTime < maxWaitTime) {
                    // Check if challenge is gone every 3 seconds
                    await this.page.waitForTimeout(3000);
                    const stillActive = await this.detectChallenge();
                    
                    if (!stillActive) {
                        console.log('Challenge appears to be resolved!');
                        return;
                    }
                    
                    // Apply more evasion techniques while waiting
                    await this.simulateRandomMouseMovements();
                }
                
                console.log('Challenge wait time exceeded, proceeding anyway...');
            } else {
                console.log('Challenge appears to be resolved quickly!');
            }
        } catch (error) {
            console.warn('Error waiting for challenge resolution:', error);
        }
    }
}

/**
 * Handles specific antibot detection and bypass for major e-commerce sites
 * @param {Page} page - Playwright page object
 */
export async function setupAntibotBypass(page) {
    try {
        // Initial antibot bypass scripts
        await page.addInitScript(() => {
            // Modify navigator properties
            const originalNavigator = window.navigator;
            const navigatorProxy = new Proxy(originalNavigator, {
                get: function(target, key) {
                    switch (key) {
                        case 'webdriver':
                            return undefined;
                        case 'plugins':
                            // Create a non-empty plugins array
                            return {
                                length: 3,
                                item: () => null,
                                namedItem: () => null,
                                refresh: () => {},
                                [Symbol.iterator]: function* () {
                                    yield { name: 'Chrome PDF Plugin' };
                                    yield { name: 'Chrome PDF Viewer' };
                                    yield { name: 'Native Client' };
                                }
                            };
                        case 'languages':
                            return ['en-US', 'en'];
                        case 'userAgent':
                            if (target.userAgent.includes('HeadlessChrome')) {
                                return target.userAgent.replace('HeadlessChrome', 'Chrome');
                            }
                            return target.userAgent;
                        default:
                            return target[key];
                    }
                }
            });
            
            // Hide headless detection signs
            const originalChrome = window.chrome || {};
            window.chrome = {
                ...originalChrome,
                app: {
                    isInstalled: false,
                    InstallState: {
                        DISABLED: 'disabled',
                        INSTALLED: 'installed',
                        NOT_INSTALLED: 'not_installed'
                    },
                    RunningState: {
                        CANNOT_RUN: 'cannot_run',
                        READY_TO_RUN: 'ready_to_run',
                        RUNNING: 'running'
                    }
                },
                runtime: {
                    OnInstalledReason: {
                        CHROME_UPDATE: 'chrome_update',
                        INSTALL: 'install',
                        SHARED_MODULE_UPDATE: 'shared_module_update',
                        UPDATE: 'update'
                    },
                    OnRestartRequiredReason: {
                        APP_UPDATE: 'app_update',
                        OS_UPDATE: 'os_update',
                        PERIODIC: 'periodic'
                    },
                    PlatformArch: {
                        ARM: 'arm',
                        ARM64: 'arm64',
                        MIPS: 'mips',
                        MIPS64: 'mips64',
                        X86_32: 'x86-32',
                        X86_64: 'x86-64'
                    },
                    PlatformNaclArch: {
                        ARM: 'arm',
                        MIPS: 'mips',
                        MIPS64: 'mips64',
                        X86_32: 'x86-32',
                        X86_64: 'x86-64'
                    },
                    PlatformOs: {
                        ANDROID: 'android',
                        CROS: 'cros',
                        LINUX: 'linux',
                        MAC: 'mac',
                        OPENBSD: 'openbsd',
                        WIN: 'win'
                    },
                    RequestUpdateCheckStatus: {
                        NO_UPDATE: 'no_update',
                        THROTTLED: 'throttled',
                        UPDATE_AVAILABLE: 'update_available'
                    }
                }
            };

            // Add missing browser features that headless browsers often lack
            if (!window.Notification) {
                window.Notification = {
                    permission: 'default',
                    requestPermission: () => Promise.resolve('default')
                };
            }

            // Override iframe manipulation detection
            const iframe = document.createElement('iframe');
            const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
            Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
                get: function() {
                    if (this.src.includes('https://challenges.cloudflare.com') || 
                        this.src.includes('captcha') || 
                        this.src.includes('challenged')) {
                        return originalContentWindow.get.call(this);
                    }
                    return originalContentWindow.get.call(this);
                }
            });
        });

        // Setup interaction event listeners
        await page.evaluate(() => {
            // Add event listeners to simulate human interaction
            document.addEventListener('mousemove', () => {
                // Record the timestamp of the last mouse movement
                window._lastInteraction = Date.now();
            });
            
            document.addEventListener('click', () => {
                // Record the timestamp of the last click
                window._lastInteraction = Date.now();
            });
            
            document.addEventListener('keydown', () => {
                // Record the timestamp of the last keypress
                window._lastInteraction = Date.now();
            });
            
            // Initialize the interaction timestamp
            window._lastInteraction = Date.now();
        });

        // Handle challenge detection and resolution
        const antibotHandler = new AntibotHandler(page);
        
        // Add page load handler to check for challenges
        page.on('load', async () => {
            await antibotHandler.handleAntibotChallenge();
        });
        
        // Also check on navigation
        page.on('navigation', async () => {
            await antibotHandler.handleAntibotChallenge();
        });

        // Watch for potential challenge frames
        page.on('framenavigated', async (frame) => {
            const url = frame.url();
            if (url.includes('captcha') || 
                url.includes('challenge') || 
                url.includes('cloudflare') ||
                url.includes('distil') ||
                url.includes('imperva') ||
                url.includes('akamai') ||
                url.includes('datadome')) {
                console.log(`Challenge frame detected: ${url}`);
                await antibotHandler.handleAntibotChallenge();
            }
        });

        return antibotHandler;
    } catch (error) {
        console.error('Error setting up antibot bypass:', error);
        return null;
    }
} 