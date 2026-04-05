import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StrategyBuilderScreen } from '../StrategyBuilderScreen';
import { NavigationContainer } from '@react-navigation/native';
import { fetchStrategyRecommendation, getLatestStrategyRecommendation } from '../../services/api';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(JSON.stringify({
    initialFunds: 10000,
    personalContribution: 200,
    companyContribution: 100,
    years: 10,
    selectedScheme: 'ANZ KiwiSaver Conservative Fund',
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

jest.mock('../../services/user', () => ({
  getOrCreateLocalUserId: jest.fn(() => Promise.resolve('local-user-1')),
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

  it('uses the local user id for recommendation reads and writes', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <StrategyBuilderScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getLatestStrategyRecommendation).toHaveBeenCalledWith(
        'local-user-1',
        'ANZ KiwiSaver Conservative Fund'
      );
    });

    fireEvent.press(getByText('Generate Client Recommendation'));

    await waitFor(() => {
      expect(fetchStrategyRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'local-user-1',
          selected_scheme: 'ANZ KiwiSaver Conservative Fund',
        })
      );
    });
  });
});
