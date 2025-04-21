// utils/brightdata.js
require('dotenv').config();

export const brightDataConfig = {
    // Browser configuration
    browser: {
        wsEndpoint: `wss://${process.env.BRIGHT_DATA_USERNAME}:${process.env.BRIGHT_DATA_PASSWORD}@brd.superproxy.io:9222`,
        options: {
            ignoreHTTPSErrors: true,
            timeout: 60000,
        }
    },
    // Proxy configuration
    proxy: {
        host: 'brd.superproxy.io',
        port: '9222',
        username: process.env.BRIGHT_DATA_USERNAME,
        password: process.env.BRIGHT_DATA_PASSWORD,
        // Add country targeting to rotate through different locations
        country: 'us',
        // Add session persistence
        session_id: Date.now().toString(),
    },
    // Enhanced browser fingerprinting
    browser: {
        rotateUserAgent: true,
        webGLVendor: 'random',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        // Add additional fingerprinting options
        screenResolution: '1920x1080',
        platform: 'Win32',
        doNotTrack: 1,
        webglParameters: true,
        // Add more realistic browser behavior
        cookies: true,
        javascript: true,
        images: true,
        cssEnabled: true,
        // Add delays between actions
        minDelay: 500,
        maxDelay: 3000
    },
    // Helper method for getting proxy URL
    getProxyUrl: (protocol = 'http') => {
        const { proxy } = brightDataConfig;
        return `${protocol}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}?country=${proxy.country}&session=${proxy.session_id}`;
    }
};

// Validate required environment variables
const requiredEnvVars = ['BRIGHT_DATA_USERNAME', 'BRIGHT_DATA_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

module.exports = brightDataConfig;