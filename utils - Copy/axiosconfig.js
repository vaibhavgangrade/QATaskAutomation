import axios from 'axios';
import networkLogger from '../utils/networkLogger';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptors
api.interceptors.request.use(networkLogger.logRequest, networkLogger.logError);
api.interceptors.response.use(networkLogger.logResponse, networkLogger.logError);

export default api;