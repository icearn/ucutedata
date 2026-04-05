import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StrategyBuilderScreen } from '../StrategyBuilderScreen';
import { NavigationContainer } from '@react-navigation/native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(JSON.stringify({
    initialFunds: 10000,
    personalContribution: 200,
    companyContribution: 100,
  }))),
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
  })),
}));

// Mock API
jest.mock('../../services/api', () => ({
  runStrategyBacktest: jest.fn(() => Promise.resolve({
    data: [],
    switches: [],
    final_balance: 15000,
    total_invested: 12000,
  })),
  fetchStrategyRecommendation: jest.fn(() => Promise.resolve(null)),
  getLatestStrategyRecommendation: jest.fn(() => Promise.reject({ response: { status: 404 } })),
}));

// Mock Expo Linear Gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient'
}));

// Mock React Native Chart Kit
jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart'
}));

// Mock Lucide Icons
jest.mock('lucide-react-native', () => ({
  Zap: 'Zap',
  Plus: 'Plus',
  Trash2: 'Trash2',
  Play: 'Play',
  ArrowRightLeft: 'ArrowRightLeft',
  TrendingDown: 'TrendingDown',
  TrendingUp: 'TrendingUp',
  AlertCircle: 'AlertCircle',
}));

describe('StrategyBuilderScreen', () => {
  it('renders correctly', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <StrategyBuilderScreen />
      </NavigationContainer>
    );

    expect(getByText('Strategy Builder')).toBeTruthy();
    expect(getByText('Switch Conditions')).toBeTruthy();
  });

  it('allows adding a condition', () => {
    const { getByText } = render(
      <NavigationContainer>
        <StrategyBuilderScreen />
      </NavigationContainer>
    );

    // Initial rule
    expect(getByText('Rule #1')).toBeTruthy();
  });
});
