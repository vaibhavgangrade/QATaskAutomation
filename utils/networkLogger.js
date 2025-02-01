import fs from 'fs';
import path from 'path';

const networkLogger = {
  logToFile: async (data) => {
    const timestamp = new Date().toISOString();
    const logPath = path.join(process.cwd(), 'network-logs');
    const logFile = path.join(logPath, `network-log-${timestamp.split('T')[0]}.json`);

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath, { recursive: true });
    }

    // Read existing logs or create new array
    let logs = [];
    if (fs.existsSync(logFile)) {
      const fileContent = fs.readFileSync(logFile, 'utf8');
      logs = JSON.parse(fileContent);
    }

    // Add new log with timestamp
    logs.push({
      timestamp,
      ...data
    });

    // Write updated logs back to file
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  },

  // Log request details
  logRequest: (config) => {
    const requestData = {
      type: 'request',
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    };

    networkLogger.logToFile(requestData);
    return config;
  },

  // Log response details
  logResponse: (response) => {
    const responseData = {
      type: 'response',
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    };

    networkLogger.logToFile(responseData);
    return response;
  },

  // Log error details
  logError: (error) => {
    const errorData = {
      type: 'error',
      url: error.config?.url,
      message: error.message
    };

    if (error.response) {
      errorData.status = error.response.status;
      errorData.statusText = error.response.statusText;
      errorData.data = error.response.data;
    }

    networkLogger.logToFile(errorData);
    return Promise.reject(error);
  }
};

export default networkLogger;