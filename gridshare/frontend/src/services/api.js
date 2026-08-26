import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const api = {
  // System Health
  getHealth: () => apiClient.get('/health'),

  // Dashboard & Summaries
  getDashboardSummary: () => apiClient.get('/dashboard/summary'),

  // Telemetry & Observe
  getCommunityState: () => apiClient.get('/observe/state'),
  getHouseholds: () => apiClient.get('/households'),
  getHousehold: (id) => apiClient.get(`/households/${id}`),
  getEnergySummary: () => apiClient.get('/energy/summary'),
  getLiveEnergy: () => apiClient.get('/energy/summary'),
  getEnergyHistory: (params) => apiClient.get('/energy/history', { params }),
  getCommunityMetrics: () => apiClient.get('/community/metrics'),

  // Community Battery & Ownership Accounting
  getBattery: () => apiClient.get('/battery'),
  getBatteryOwnership: () => apiClient.get('/battery/ownership'),
  contributeBattery: (data) => apiClient.post('/battery/contribute', data),
  withdrawBattery: (data) => apiClient.post('/battery/withdraw', data),
  getBatteryLedger: (limit = 100) => apiClient.get('/battery/ledger', { params: { limit } }),
  evaluateStorageDecision: (data) => apiClient.post('/optimization/storage-decision', data),
  runBatteryFairnessDemo: () => apiClient.post('/demo/battery-fairness-demo'),

  // AI Prediction & Optimizer
  getPredictions: (params) => apiClient.get('/predictions', { params }),
  getLatestPredictions: (params) => apiClient.get('/predictions', { params }),
  runPredictionPipeline: () => apiClient.post('/predictions/run'),
  getOptimizations: (limit = 50) => apiClient.get('/optimizations', { params: { limit } }),
  getLatestOptimization: (limit = 10) => apiClient.get('/optimization/latest', { params: { limit } }),
  runOptimization: (data) => apiClient.post('/optimize', data),

  // P2P Double-Auction Marketplace
  getMarketOffers: (params) => apiClient.get('/market/offers', { params }),
  createOffer: (data) => apiClient.post('/market/offers', data),
  cancelOffer: (id) => apiClient.delete(`/market/offers/${id}`),
  getMarketRequests: (params) => apiClient.get('/market/requests', { params }),
  createRequest: (data) => apiClient.post('/market/requests', data),
  cancelRequest: (id) => apiClient.delete(`/market/requests/${id}`),
  matchOrders: () => apiClient.post('/market/match'),
  getMarketTransactions: (limit = 50) => apiClient.get('/market/transactions', { params: { limit } }),
  getTrades: (limit = 50) => apiClient.get('/trades', { params: { limit } }),
  postTelemetry: (data) => apiClient.post('/telemetry', data),

  // Demo Mode Endpoints
  runDemoScenario: () => apiClient.post('/demo/run-scenario'),
  resetDemo: () => apiClient.post('/demo/reset'),
};

export default api;
