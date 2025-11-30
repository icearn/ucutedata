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

export default api;
