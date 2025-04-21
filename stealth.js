// stealth.js
async function addStealthScripts(page) {
    await page.addInitScript(() => {
        // Override property descriptors
        const overridePropertyDescriptor = (obj, prop, descriptor) => {
            Object.defineProperty(obj, prop, {
                ...descriptor,
                configurable: true
            });
        };

        // WebGL fingerprint protection
        const getParameterProxyHandler = {
            apply(target, ctx, args) {
                const param = args[0];
                const result = target.apply(ctx, args);
                
                if (param === 37445) {
                    return 'Intel Inc.';
                }
                if (param === 37446) {
                    return 'Intel Iris OpenGL Engine';
                }
                return result;
            }
        };

        if (window.WebGLRenderingContext) {
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = new Proxy(getParameter, getParameterProxyHandler);
        }

        // Plugins and mime types
        const mockedPlugins = {
            length: 3,
            item: () => null,
            refresh: () => {},
            [Symbol.iterator]: function* () {
                yield { name: 'Chrome PDF Plugin' };
                yield { name: 'Chrome PDF Viewer' };
                yield { name: 'Native Client' };
            }
        };

        // Navigator properties
        const mockedNavigator = {
            webdriver: undefined,
            languages: ['en-US', 'en'],
            plugins: mockedPlugins,
            mimeTypes: mockedPlugins,
            platform: 'Win32',
            hardwareConcurrency: 8,
            deviceMemory: 8,
            userAgent: navigator.userAgent,
            vendor: 'Google Inc.',
            connection: {
                effectiveType: '4g',
                rtt: 50,
                downlink: 10,
                saveData: false
            }
        };

        // Apply navigator mocks
        Object.entries(mockedNavigator).forEach(([key, value]) => {
            if (!(key in Navigator.prototype)) {
                overridePropertyDescriptor(navigator, key, {
                    get: () => value
                });
            }
        });

        // Chrome object
        window.chrome = {
            app: {
                isInstalled: false,
                InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
                RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }
            },
            runtime: {
                PlatformOs: {
                    MAC: 'mac',
                    WIN: 'win',
                    ANDROID: 'android',
                    CROS: 'cros',
                    LINUX: 'linux',
                    OPENBSD: 'openbsd'
                }
            }
        };

        // Permission API
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' 
                ? Promise.resolve({ state: Notification.permission }) 
                : originalQuery(parameters)
        );

        // Additional stealth techniques
        // Timezone spoofing
        const originalDateTimeFormat = Intl.DateTimeFormat;
        Intl.DateTimeFormat = function(locale, options) {
            return new originalDateTimeFormat('en-US', options);
        };

        // WebRTC IP leak protection
        const originalRTCPeerConnection = window.RTCPeerConnection;
        window.RTCPeerConnection = function(config) {
            const pc = new originalRTCPeerConnection(config);
            pc.createDataChannel = () => {};
            return pc;
        };
    });
}

module.exports = { addStealthScripts };
