import axios from 'axios';
import { Platform } from 'react-native';

// Docker exposes the backend API on 8001 locally. Keep the env override for other deployments.
const DEFAULT_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8001' : 'http://localhost:8001';
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getSchemes = async () => {
  const response = await api.get('/api/asb/schemes');
  return response.data;
};

export const getCurrentPrices = async (lookbackDays: number = 14, store: boolean = true) => {
  const response = await api.get('/api/asb/current-prices', {
    params: {
      lookback_days: lookbackDays,
      store,
    },
  });
  return response.data;
};

export const getTrends = async (
  startDate: string,
  endDate: string,
  schemes?: string[],
  includeChart: boolean = true
) => {
  const response = await api.post('/api/asb/trends', {
    start_date: startDate,
    end_date: endDate,
    schemes,
    include_chart: includeChart,
  });
  return response.data;
};

export const getReturns = async (
  schemes: string[],
  startDate: string,
  endDate: string,
  initialAmount: number
) => {
  const response = await api.post('/api/asb/returns', {
    schemes,
    start_date: startDate,
    end_date: endDate,
    initial_amount: initialAmount,
  });
  return response.data;
};

export const createAlertRule = async (payload: {
  user_id: string;
  provider: string;
  scheme: string;
  metric: 'unit_price' | 'percent_change';
  comparison: 'gte' | 'lte' | 'eq';
  target_value: number;
  reference_price?: number;
  label?: string;
  channel?: string;
  channel_target?: string;
  trigger_once?: boolean;
}) => {
  const response = await api.post('/api/alerts/rules', payload);
  return response.data;
};

export const getAlertRules = async (userId?: string, activeOnly?: boolean) => {
  const response = await api.get('/api/alerts/rules', {
    params: {
      user_id: userId,
      active_only: activeOnly,
    },
  });
  return response.data;
};

export const fetchCurrentSchemeAnalysis = async (
  schemeIds: string[],
  years: number,
  initialFunds: number,
  monthlyContribution: number
) => {
  const response = await api.post('/api/analysis/current-scheme', {
    scheme_ids: schemeIds,
    years,
    initial_funds: initialFunds,
    monthly_contribution: monthlyContribution,
  });
  return response.data;
};

export const runStrategyBacktest = async (
  conditions: any[],
  initialFunds: number,
  monthlyContribution: number,
  years: number = 10
) => {
  const response = await api.post('/api/strategy/backtest', {
    conditions,
    initial_funds: initialFunds,
    monthly_contribution: monthlyContribution,
    years,
  });
  return response.data;
};

export default api;
