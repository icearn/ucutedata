import axios from 'axios';
import { Platform } from 'react-native';

// Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

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

export const getTrends = async (startDate: string, endDate: string, schemes?: string[]) => {
  const response = await api.post('/api/asb/trends', {
    start_date: startDate,
    end_date: endDate,
    schemes,
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
