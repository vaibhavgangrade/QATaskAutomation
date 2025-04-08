const dotenv = require('dotenv');
const { retailerConfig } = require('../config/retailers.js');
dotenv.config();

const retailer = process.env.RETAILER || 'amazon';
const config = retailerConfig[retailer];

if (!config) {
    throw new Error(`No configuration found for retailer: ${retailer}`);
}

const initialBrowserSetup = {
    async setupBrowser(context) {
        try {
            // Reduce default timeout
            context.setDefaultTimeout(20000);

            // Add dialog handling
            context.on('dialog', async (dialog) => {
                console.log('Dialog detected:', dialog.type(), dialog.message());
                await dialog.dismiss().catch(() => {});
            });

            // Handle authentication dialogs at context level
            await context.setHTTPCredentials({
                username: '',  // Empty credentials to prevent Windows auth prompt
                password: ''
            });

            // Keep the stealth script but optimize timing
            await context.addInitScript(() => {
                (() => {
                    // Advanced Fingerprint Randomization
                    const generateFingerprint = () => {
                        const fingerprint = {
                            screen: {
                                width: 1420,
                                height: 1080,
                                availWidth: 1480,
                                availHeight: 1040,
                                colorDepth: 24,
                                pixelDepth: 24
                            },
                            timezone: 'America/New_York',
                            language: 'en-US',
                            platform: 'Win32',
                            cores: 8
                        };

                        // Randomize values slightly
                        fingerprint.screen.width += Math.floor(Math.random() * 100);
                        fingerprint.screen.height += Math.floor(Math.random() * 100);
                        return fingerprint;
                    };

                    const fp = generateFingerprint();

                    // Override properties with proxy getters
                    const overrideProperty = (obj, prop, value) => {
                        Object.defineProperty(obj, prop, {
                            get: () => value,
                            enumerable: true,
                            configurable: true
                        });
                    };

                    // Screen properties
                    overrideProperty(window.screen, 'width', fp.screen.width);
                    overrideProperty(window.screen, 'height', fp.screen.height);
                    overrideProperty(window.screen, 'availWidth', fp.screen.availWidth);
                    overrideProperty(window.screen, 'availHeight', fp.screen.availHeight);
                    overrideProperty(window.screen, 'colorDepth', fp.screen.colorDepth);
                    overrideProperty(window.screen, 'pixelDepth', fp.screen.pixelDepth);

                    // Navigator properties
                    overrideProperty(navigator, 'hardwareConcurrency', fp.cores);
                    overrideProperty(navigator, 'language', fp.language);
                    overrideProperty(navigator, 'platform', fp.platform);
                    overrideProperty(navigator, 'webdriver', undefined);

                    // Hide automation
                    overrideProperty(navigator, 'plugins', {
                        length: 3,
                        item: () => null,
                        refresh: () => {},
                        namedItem: () => null,
                        [Symbol.iterator]: function* () {
                            yield { name: 'Chrome PDF Plugin' };
                            yield { name: 'Chrome PDF Viewer' };
                            yield { name: 'Native Client' };
                        }
                    });

                    // Override permissions API
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' 
                            ? Promise.resolve({ state: Notification.permission })
                            : originalQuery(parameters)
                    );

                    // Optimize natural behavior intervals
                    const addNaturalBehavior = () => {
                        // Reduce frequency of mouse movements
                        setInterval(() => {
                            if (Math.random() > 0.7) { // Only 30% chance to trigger
                                const event = new MouseEvent('mousemove', {
                                    bubbles: true,
                                    cancelable: true,
                                    clientX: Math.random() * window.innerWidth,
                                    clientY: Math.random() * window.innerHeight,
                                    screenX: Math.random() * window.screen.width,
                                    screenY: Math.random() * window.screen.height,
                                    movementX: Math.random() * 20 - 10,
                                    movementY: Math.random() * 20 - 10
                                });
                                document.dispatchEvent(event);
                            }
                        }, 2000); // Reduced from 1000-3000 to fixed 2000ms

                        // Reduce scroll frequency
                        setInterval(() => {
                            if (Math.random() > 0.8) { // Only 20% chance to trigger
                                window.scrollBy({
                                    top: (Math.random() * 100) - 50,
                                    behavior: 'smooth'
                                });
                            }
                        }, 3000); // Fixed interval
                    };

                    // Optimize load event listener
                    if (document.readyState === 'complete') {
                        setTimeout(addNaturalBehavior, 1000);
                    } else {
                        window.addEventListener('load', () => setTimeout(addNaturalBehavior, 1000));
                    }

                    // Canvas fingerprint randomization
                    const originalGetContext = HTMLCanvasElement.prototype.getContext;
                    HTMLCanvasElement.prototype.getContext = function(type) {
                        const context = originalGetContext.apply(this, arguments);
                        if (type === '2d') {
                            const originalFillText = context.fillText;
                            context.fillText = function() {
                                context.shadowColor = `rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`;
                                context.shadowBlur = Math.random() * 0.5;
                                return originalFillText.apply(this, arguments);
                            }
                        }
                        return context;
                    };

                    // Add credential handling
                    Object.defineProperty(navigator, 'credentials', {
                        value: {
                            get: () => Promise.resolve(null),
                            store: () => Promise.resolve(),
                            preventSilentAccess: () => Promise.resolve()
                        }
                    });

                    // Prevent authentication prompts
                    window.addEventListener('load', () => {
                        if (window.PasswordCredential) {
                            window.PasswordCredential = undefined;
                        }
                    });

                    // TLS and HTTP/2 fingerprint randomization
                    // This simulates various browser TLS behaviors
                    (() => {
                        // Override navigator.connection to randomize network information
                        const connectionTypes = ['wifi', 'cellular', 'ethernet', '4g', '3g'];
                        Object.defineProperty(navigator, 'connection', {
                            get: () => ({
                                effectiveType: connectionTypes[Math.floor(Math.random() * connectionTypes.length)],
                                rtt: Math.floor(Math.random() * 100) + 50,
                                downlink: Math.random() * 10 + 1,
                                saveData: Math.random() > 0.8
                            })
                        });
                        
                        // Override font fingerprinting
                        const originalQuerySelector = document.querySelector;
                        document.querySelector = function(...args) {
                            // Randomize font metrics slightly
                            if (args[0] && args[0].includes('font') || args[0].includes('text')) {
                                const elem = originalQuerySelector.apply(this, args);
                                if (elem) {
                                    const originalGetClientRects = elem.getClientRects;
                                    elem.getClientRects = function() {
                                        const rects = originalGetClientRects.apply(this);
                                        // Add subtle variations to font measurements
                                        Array.from(rects).forEach(rect => {
                                            rect.width += (Math.random() * 0.2) - 0.1;
                                            rect.height += (Math.random() * 0.2) - 0.1;
                                        });
                                        return rects;
                                    };
                                }
                                return elem;
                            }
                            return originalQuerySelector.apply(this, args);
                        };
                        
                        // Override audio fingerprinting
                        const AudioContext = window.AudioContext || window.webkitAudioContext;
                        if (AudioContext) {
                            const originalGetChannelData = AudioContext.prototype.createAnalyser;
                            AudioContext.prototype.createAnalyser = function() {
                                const analyser = originalGetChannelData.apply(this, arguments);
                                const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
                                analyser.getFloatFrequencyData = function(array) {
                                    originalGetFloatFrequencyData.apply(this, arguments);
                                    // Add slight noise to audio data
                                    for (let i = 0; i < array.length; i++) {
                                        array[i] += (Math.random() * 0.1) - 0.05;
                                    }
                                    return array;
                                };
                                return analyser;
                            };
                        }
                    })();
                })();
            });

            // Keep session recovery but optimize timing
            context.on('requestfailed', async request => {
                const failure = request.failure();
                if (failure && (
                    failure.errorText.includes('blocked') ||
                    failure.errorText.includes('denied') ||
                    failure.errorText.includes('429')
                )) {
                    await this.handleSessionRecovery(context);
                }
            });

            return context;
        } catch (error) {
            console.error('Browser setup failed:', error);
            throw error;
        }
    },

    async handleSessionRecovery(context) {
        try {
            // Session recovery functionality is disabled
            // Code for proxy rotation and header customization has been removed
            
            // Comment out storage clearing
            // await context.clearCookies();
            // await context.clearPermissions();
            
            // Comment out delay
            // await new Promise(r => setTimeout(r, 15000 + Math.random() * 20000));
            
            console.log('Session recovery disabled');
        } catch (error) {
            console.warn('Session recovery attempt failed:', error);
        }
    },

    async prewarmSession(page) {
        try {
            // Reduce initial delay
            await page.waitForTimeout(500);

            // Optimize initial page load
            await Promise.race([
                page.goto(`https://www.${config.domain}`, {
                    waitUntil: 'domcontentloaded',
                    timeout: 20000
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Navigation timeout')), 20000))
            ]);

            // Quick security check
            await this.handleSecurityCheck(page);
            
            return page;
        } catch (error) {
            console.error('Session pre-warming failed:', error);
            throw error;
        }
    },

    async handleSecurityCheck(page) {
        try {
            // Optimize security check detection
            const hasChallenge = await Promise.race([
                page.locator('iframe[title*="challenge"]').isVisible(),
                page.locator('text=Verify you are human').isVisible(),
                page.locator('text=Just a moment...').isVisible(),
                new Promise(resolve => setTimeout(() => resolve(false), 5000))
            ]);

            if (hasChallenge) {
                console.log('Security check detected, waiting for resolution...');
                await Promise.race([
                    page.waitForSelector('.header2021-logo-img', { timeout: 20000 }),
                    page.waitForSelector('a[href*="Newegg"]', { timeout: 20000 }),
                    page.waitForNavigation({ timeout: 20000 })
                ]).catch(() => {});
            }
        } catch (error) {
            console.warn('Security check handling warning:', error);
        }
    },

    async simulateNaturalBrowsing(page) {
        try {
            // Minimal initial wait
            await page.waitForTimeout(500);

            // Optimize scrolling
            await page.evaluate(() => {
                return new Promise((resolve) => {
                    const maxScroll = Math.min(400, document.documentElement.scrollHeight - window.innerHeight);
                    if (maxScroll <= 0) {
                        resolve();
                        return;
                    }

                    window.scrollBy({
                        top: maxScroll,
                        behavior: 'smooth'
                    });

                    setTimeout(resolve, 1000);
                });
            });
        } catch (error) {
            console.warn('Natural browsing simulation warning:', error);
        }
    },

    async simulateAdvancedHumanBehavior(page) {
        try {
            // Randomize mouse movements
            const viewportSize = page.viewportSize();
            if (viewportSize) {
                // Initial mouse movement to center
                await page.mouse.move(
                    viewportSize.width / 2,
                    viewportSize.height / 2
                );
                
                // Random movements
                for (let i = 0; i < 3; i++) {
                    const x = Math.floor(Math.random() * viewportSize.width);
                    const y = Math.floor(Math.random() * viewportSize.height);
                    await page.mouse.move(x, y, { steps: 5 });
                    await page.waitForTimeout(Math.random() * 300 + 100);
                }
            }
            
            // Light scrolling
            await page.evaluate(() => {
                window.scrollBy({
                    top: 100 + Math.floor(Math.random() * 200),
                    behavior: 'smooth'
                });
            });
            
            await page.waitForTimeout(500);
        } catch (error) {
            console.warn('Error in human behavior simulation:', error);
        }
    },

    async setupPage(page) {
        try {
            // Remove all resource routing/blocking
            // Keep only the WebGL fingerprinting override for anti-bot
            await page.evaluate(() => {
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    const rand = () => Math.random().toString(36).substring(7);
                    if (parameter === 37445) return `Intel ${rand()}`;
                    if (parameter === 37446) return `ANGLE (Intel, Intel(R) UHD Graphics ${rand()}, OpenGL 4.1)`;
                    return getParameter.apply(this, arguments);
                };
            });

            // Add loader detection and handling
            await page.evaluate(() => {
                window.addEventListener('load', () => {
                    const loaders = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
                    loaders.forEach(loader => {
                        if (loader) {
                            const observer = new MutationObserver((mutations) => {
                                mutations.forEach((mutation) => {
                                    if (mutation.type === 'attributes' && loader.style.display === 'none') {
                                        observer.disconnect();
                                    }
                                });
                            });
                            observer.observe(loader, { attributes: true });
                        }
                    });
                });
            });

            // Add authentication handling
            await page.route('**/*', async (route) => {
                const request = route.request();
                const headers = request.headers();

                // Skip authentication for all requests
                if (request.headerValue('www-authenticate')) {
                    headers['Authorization'] = '';  // Empty auth header
                    headers['WWW-Authenticate'] = 'None';
                }

                // Add random delays and other headers
                await new Promise(r => setTimeout(r, Math.random() * 500));
                headers['Cache-Control'] = Math.random() > 0.5 ? 'no-cache' : 'max-age=0';
                
                await route.continue({ headers });
            });

            // Add credential handling to page
            await page.evaluate(() => {
                // Disable credential prompts
                if (window.PasswordCredential) {
                    window.PasswordCredential = undefined;
                }
                
                // Prevent authentication popups
                if (window.authenticate) {
                    window.authenticate = () => Promise.resolve();
                }
            });

            // Setup antibot detection and handling events
            page.on('load', async () => {
                await this.handleAntibotChallenge(page);
            });
            
            page.on('framenavigated', async (frame) => {
                if (frame === page.mainFrame()) {
                    await this.handleAntibotChallenge(page);
                }
            });

        } catch (error) {
            console.warn('Page setup warning:', error);
        }
    },

    // Add new method for ensuring page focus
    async ensurePageFocus(page) {
        try {
            await Promise.race([
                page.bringToFront(),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);

            await page.evaluate(() => {
                window.focus();
                document.body?.click();
            });
        } catch (error) {
            console.warn('Focus ensuring warning:', error);
        }
    },

    async cleanup(page, context) {
        try {
            if (page && !page.isClosed()) {
                await page.close().catch(() => {});
            }
            if (context) {
                await context.clearCookies().catch(() => {});
            }
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    },

    // Add new antibot detection and handling method
    async handleAntibotChallenge(page) {
        try {
            console.log('Checking for antibot challenges...');
            
            // Check for common challenge indicators
            const challengeSelectors = [
                'iframe[title*="challenge"]',
                'iframe[src*="captcha"]',
                'iframe[src*="cloudflare"]',
                'iframe[src*="distil"]',
                'iframe[src*="imperva"]',
                'iframe[src*="akamai"]',
                'iframe[src*="datadome"]',
                'text=Verify you are human',
                'text=Just a moment...',
                'text=Please wait while we verify',
                'text=Security Challenge',
                'text=Confirm you are not a robot',
                '#challenge-running',
                '#js_info',
                '.antibot-challenge',
                'form[action*="captcha"]'
            ];

            let challengeDetected = false;
            
            // Check each selector
            for (const selector of challengeSelectors) {
                try {
                    const isVisible = await page.locator(selector).isVisible({ timeout: 1000 });
                    if (isVisible) {
                        console.log(`🤖 Bot challenge detected: ${selector}`);
                        challengeDetected = true;
                        break;
                    }
                } catch (e) {
                    // Ignore errors when checking selectors
                }
            }

            if (!challengeDetected) {
                // Also check for text content patterns
                const pageContent = await page.content();
                const challengePatterns = [
                    /security check/i,
                    /automated access/i,
                    /bot detection/i,
                    /captcha/i,
                    /human verification/i,
                    /ddos protection/i,
                    /just a moment/i,
                    /checking your browser/i
                ];
                
                for (const pattern of challengePatterns) {
                    if (pattern.test(pageContent)) {
                        console.log(`🤖 Bot challenge detected via text pattern: ${pattern}`);
                        challengeDetected = true;
                        break;
                    }
                }
            }

            if (challengeDetected) {
                console.log('🛡️ Antibot challenge detected, attempting to bypass...');
                
                // Apply bypass techniques
                await this.applyAntibotEvasion(page);
                
                // Handle specific challenge types
                await this.handleSpecificChallenges(page);
                
                // Wait for challenge to potentially resolve
                console.log('⏱️ Waiting for challenge to resolve...');
                await page.waitForTimeout(5000);
                
                // Check if we're still on a challenge page
                const stillHasChallenge = await this.isChallengePage(page);
                if (!stillHasChallenge) {
                    console.log('✅ Challenge appears to be bypassed!');
                    return true;
                }
                
                // More extensive handling if challenge persists
                console.log('⏱️ Challenge still active, applying additional techniques...');
                await this.applyExtendedEvasionTechniques(page);
                
                // Final check
                await page.waitForTimeout(10000);
                return !await this.isChallengePage(page);
            }
            
            // Check specifically for slider puzzle
            const hasSliderPuzzle = await page.locator('text=Slide right to complete the puzzle').isVisible()
              .catch(() => false);

            if (hasSliderPuzzle) {
                console.log('🧩 Slider puzzle detected!');
                const puzzleSolved = await handleSliderPuzzle(page);
                if (puzzleSolved) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.warn('Error in antibot challenge handling:', error);
            return false;
        }
    },
    
    // Check if page still has challenge elements
    async isChallengePage(page) {
        try {
            const challengeSelectors = [
                'iframe[title*="challenge"]',
                'iframe[src*="captcha"]',
                'text=Verify you are human',
                'text=Just a moment...',
                '#challenge-running'
            ];
            
            for (const selector of challengeSelectors) {
                try {
                    const isVisible = await page.locator(selector).isVisible({ timeout: 1000 });
                    if (isVisible) return true;
                } catch (e) {
                    // Ignore errors
                }
            }
            
            return false;
        } catch (error) {
            return false;
        }
    },
    
    // Apply initial antibot evasion techniques
    async applyAntibotEvasion(page) {
        try {
            // 1. Simulate human-like behavior
            await this.simulateAdvancedHumanBehavior(page);
            
            // 2. Inject antibot evasion scripts
            await page.evaluate(() => {
                // Override automation detection
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                
                // Override screen properties with subtle randomization
                if (window.screen) {
                    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
                    
                    // Add random variations to screen properties
                    const originalWidth = window.screen.width;
                    const originalHeight = window.screen.height;
                    const originalColorDepth = window.screen.colorDepth;
                    
                    Object.defineProperty(window.screen, 'width', { 
                        get: () => originalWidth + getRandomInt(-3, 3)
                    });
                    Object.defineProperty(window.screen, 'height', { 
                        get: () => originalHeight + getRandomInt(-3, 3)
                    });
                    Object.defineProperty(window.screen, 'colorDepth', { 
                        get: () => originalColorDepth 
                    });
                }
                
                // Override Chrome properties if needed
                if (!window.chrome) {
                    window.chrome = {
                        runtime: {},
                        loadTimes: function() {},
                        csi: function() {},
                        app: {}
                    };
                }
                
                // Override Canvas fingerprinting
                const originalGetContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function() {
                    const context = originalGetContext.apply(this, arguments);
                    if (context && arguments[0] === '2d') {
                        const originalGetImageData = context.getImageData;
                        context.getImageData = function() {
                            const imageData = originalGetImageData.apply(this, arguments);
                            // Subtly modify the image data
                            for (let i = 0; i < imageData.data.length; i += 50) {
                                imageData.data[i] = (imageData.data[i] + 1) % 256;
                            }
                            return imageData;
                        };
                    }
                    return context;
                };
                
                // Setup human-like random interactions to maintain "liveness"
                const simulateRandomActivity = () => {
                    if (Math.random() > 0.7) {
                        const x = Math.floor(Math.random() * window.innerWidth);
                        const y = Math.floor(Math.random() * window.innerHeight);
                        const event = new MouseEvent('mousemove', {
                            clientX: x,
                            clientY: y,
                            bubbles: true
                        });
                        document.dispatchEvent(event);
                    }
                };
                
                // Set up interval for random activity
                setInterval(simulateRandomActivity, 2000 + Math.floor(Math.random() * 3000));
            });
            
        } catch (error) {
            console.warn('Error applying antibot evasion:', error);
        }
    },
    
    // Apply more extensive evasion techniques for persistent challenges
    async applyExtendedEvasionTechniques(page) {
        try {
            // More complex mouse movements
            const viewportSize = page.viewportSize();
            if (viewportSize) {
                for (let i = 0; i < 5; i++) {
                    // Random points within viewport
                    const x1 = Math.floor(Math.random() * viewportSize.width);
                    const y1 = Math.floor(Math.random() * viewportSize.height);
                    const x2 = Math.floor(Math.random() * viewportSize.width);
                    const y2 = Math.floor(Math.random() * viewportSize.height);
                    
                    // Move to first point
                    await page.mouse.move(x1, y1, { steps: 10 });
                    await page.waitForTimeout(100 + Math.random() * 200);
                    
                    // Move to second point
                    await page.mouse.move(x2, y2, { steps: 10 });
                    await page.waitForTimeout(100 + Math.random() * 200);
                }
            }
            
            // Try to find and click a challenge button if present
            const verifyButtons = [
                'button:has-text("Verify")',
                'button:has-text("Continue")',
                'button:has-text("I am human")',
                'input[type="submit"]',
                'button[type="submit"]'
            ];
            
            for (const selector of verifyButtons) {
                try {
                    const isVisible = await page.locator(selector).isVisible({ timeout: 1000 });
                    if (isVisible) {
                        await page.locator(selector).click();
                        console.log(`Clicked verification button: ${selector}`);
                        await page.waitForTimeout(2000);
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }
            
            // More natural scrolling
            await page.evaluate(() => {
                return new Promise(resolve => {
                    // More natural scrolling patterns
                    const totalScrollSteps = 3 + Math.floor(Math.random() * 3);
                    let currentStep = 0;
                    
                    const scrollStep = () => {
                        if (currentStep >= totalScrollSteps) {
                            resolve();
                            return;
                        }
                        
                        const scrollAmount = 100 + Math.floor(Math.random() * 200);
                        window.scrollBy({
                            top: scrollAmount,
                            behavior: 'smooth'
                        });
                        
                        currentStep++;
                        setTimeout(scrollStep, 500 + Math.random() * 1000);
                    };
                    
                    scrollStep();
                });
            });
            
            // Inject more advanced anti-fingerprinting techniques
            await page.evaluate(() => {
                // Override WebRTC to prevent IP leaks
                if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                    const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
                    navigator.mediaDevices.enumerateDevices = function() {
                        return originalEnumerateDevices.apply(this, arguments)
                            .then(devices => {
                                return devices.filter(device => device.kind !== 'videoinput');
                            });
                    };
                }
                
                // Override AudioContext fingerprinting
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
                
                // Add more browser-like behaviors
                document.hasFocus = function() { return true; };
                window.devicePixelRatio = Math.floor(window.devicePixelRatio * 100) / 100;
            });
        } catch (error) {
            console.warn('Error applying extended evasion techniques:', error);
        }
    },
    
    // Handle specific types of challenges (like CloudFlare, etc.)
    async handleSpecificChallenges(page) {
        try {
            // Check for CloudFlare challenge
            const isCloudflare = await page.locator('iframe[src*="cloudflare"]').isVisible().catch(() => false);
            if (isCloudflare) {
                console.log('Detected CloudFlare challenge');
                
                // Try to find and switch to the challenge iframe
                const iframes = await page.locator('iframe[src*="cloudflare"]').all();
                if (iframes.length > 0) {
                    const challengeFrame = await iframes[0].contentFrame();
                    if (challengeFrame) {
                        // Try to find and click the checkbox
                        const checkbox = await challengeFrame.locator('.rc-anchor-checkbox').isVisible().catch(() => false);
                        if (checkbox) {
                            await challengeFrame.locator('.rc-anchor-checkbox').click().catch(() => {});
                        }
                    }
                }
                
                // Wait for challenge processing
                await page.waitForTimeout(5000);
                return true;
            }
            
            // Check for "I am human" button
            const humanButton = await page.locator('button:has-text("I am human")').isVisible().catch(() => false);
            if (humanButton) {
                await page.locator('button:has-text("I am human")').click();
                await page.waitForTimeout(3000);
                return true;
            }
            
            // Check for "Please verify you are human" text
            const verifyHumanText = await page.locator('text=Please verify you are human').isVisible().catch(() => false);
            if (verifyHumanText) {
                // Look for any nearby buttons or checkboxes
                const buttons = [
                    'button:near(:text("Please verify you are human"))',
                    'input[type="checkbox"]:near(:text("Please verify you are human"))',
                    'input[type="submit"]:near(:text("Please verify you are human"))'
                ];
                
                for (const buttonSelector of buttons) {
                    try {
                        const buttonVisible = await page.locator(buttonSelector).isVisible({ timeout: 1000 });
                        if (buttonVisible) {
                            await page.locator(buttonSelector).click();
                            await page.waitForTimeout(3000);
                            break;
                        }
                    } catch (e) {
                        // Continue to next button
                    }
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.warn('Error handling specific challenges:', error);
            return false;
        }
    },
};

module.exports = initialBrowserSetup;
module.exports.createBrowserSession = createBrowserSession;
module.exports.handleSliderPuzzle = handleSliderPuzzle;

async function createBrowserSession(browser) {
    // Pick a random user agent from a list of real browser user agents
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.2365.92',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ];
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    // Safely extract Chrome version or use a default
    const getChromeVersion = (ua) => {
        const match = ua.match(/Chrome\/(\d+)/);
        return match ? match[1] : '122'; // Default to 122 if not found
    };
    const chromeVersion = getChromeVersion(randomUserAgent);

    // Random viewport sizes that resemble real devices
    const viewportSizes = [
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 1536, height: 864 },
        { width: 1920, height: 1080 }
    ];
    const randomViewport = viewportSizes[Math.floor(Math.random() * viewportSizes.length)];
    
    // Random US timezones
    const timezones = [
        'America/New_York',
        'America/Los_Angeles',
        'America/Chicago',
        'America/Denver'
    ];
    const randomTimezone = timezones[Math.floor(Math.random() * timezones.length)];

    const context = await browser.newContext({
        viewport: randomViewport,
        userAgent: randomUserAgent,
        deviceScaleFactor: 1,
        hasTouch: false,
        locale: 'en-US',
        timezoneId: randomTimezone,
        permissions: ['geolocation'],
        // Security and performance options
        ignoreHTTPSErrors: true,
        bypassCSP: true,
        javaScriptEnabled: true,
        // Additional options
        acceptDownloads: true,
        isMobile: false,
        httpCredentials: {
            username: '',  // Empty credentials to prevent Windows auth prompt
            password: ''
        },
        extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': `"Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}"`,
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'Authorization': '',  // Empty authorization to prevent auth prompts
            'WWW-Authenticate': 'None'  // Prevent auth challenges
        }
    });

    // Add page handling for new pages
    context.on('page', async (page) => {
        // Handle dialogs on new pages
        page.on('dialog', async (dialog) => {
            await dialog.dismiss().catch(() => {});
        });
        
        // Setup the page with antibot evasion
        await initialBrowserSetup.setupPage(page).catch(err => 
            console.warn('New page setup warning:', err)
        );
    });

    await initialBrowserSetup.setupBrowser(context);

    // Simulate realistic network conditions
    const networkConditions = [
        { latency: 20, downloadThroughput: 5 * 1024 * 1024, uploadThroughput: 1 * 1024 * 1024 },
        { latency: 40, downloadThroughput: 2 * 1024 * 1024, uploadThroughput: 512 * 1024 },
        { latency: 60, downloadThroughput: 1 * 1024 * 1024, uploadThroughput: 256 * 1024 }
    ];

    const randomNetworkCondition = networkConditions[Math.floor(Math.random() * networkConditions.length)];
    await context.route('**/*', async (route) => {
        await new Promise(r => setTimeout(r, randomNetworkCondition.latency));
        await route.continue();
    });

    return context;
}

// Optimize random delays
async function addRandomDelay() {
    const delay = 500 + Math.random() * 1000; // Reduced from 1000-3000 to 500-1500
    await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Handles slider puzzle CAPTCHA challenges
 * @param {Page} page - Playwright page object
 * @returns {Promise<boolean>} - True if handled successfully
 */
async function handleSliderPuzzle(page) {
  try {
    console.log('Checking for slider puzzle CAPTCHA...');

    // Check if we have a slider puzzle on the page
    const hasSliderPuzzle = await page.locator('text=Slide right to complete the puzzle').isVisible()
      .catch(() => false);
    
    if (!hasSliderPuzzle) {
      return false;
    }

    console.log('Slider puzzle detected, attempting to solve...');

    // Find the slider element
    const sliderElement = await page.locator('button[class*="arrow"], button >> svg[class*="arrow"], button:has([class*="arrow"])').first();
    
    if (!await sliderElement.isVisible()) {
      console.log('Could not find the slider element');
      return false;
    }

    // Get slider position
    const sliderBox = await sliderElement.boundingBox();
    if (!sliderBox) {
      console.log('Could not get slider element bounds');
      return false;
    }

    // Calculate points for sliding
    const startX = sliderBox.x + sliderBox.width / 2;
    const startY = sliderBox.y + sliderBox.height / 2;
    const endX = startX + 250; // Adjust to slide all the way
    
    // Execute the slide with human-like motion
    await page.mouse.move(startX, startY, { steps: 5 });
    await page.waitForTimeout(300 + Math.random() * 200);
    await page.mouse.down();
    await page.waitForTimeout(200 + Math.random() * 100);
    
    // Move in small steps with random delays to appear human-like
    const steps = 10 + Math.floor(Math.random() * 5);
    const distance = endX - startX;
    
    for (let i = 1; i <= steps; i++) {
      const stepX = startX + (distance * i / steps);
      // Add slight variation in Y to make movement more human
      const stepY = startY + (Math.random() * 2 - 1);
      await page.mouse.move(stepX, stepY, { steps: 3 });
      await page.waitForTimeout(30 + Math.random() * 40);
    }
    
    await page.waitForTimeout(200 + Math.random() * 100);
    await page.mouse.up();
    
    // Wait for verification
    await page.waitForTimeout(2000);
    
    // Check if verification was successful (puzzle no longer visible)
    const stillHasPuzzle = await page.locator('text=Slide right to complete the puzzle').isVisible()
      .catch(() => false);
    
    if (!stillHasPuzzle) {
      console.log('Slider puzzle solved successfully!');
      return true;
    } else {
      console.log('Slider puzzle still present, verification may have failed');
      return false;
    }
  } catch (error) {
    console.warn('Error handling slider puzzle:', error);
    return false;
  }
}
