import React from 'react';
import { render } from '@testing-library/react-native';
import { CurrentSchemeAnalysisScreen } from '../CurrentSchemeAnalysisScreen';
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
  fetchCurrentSchemeAnalysis: jest.fn(() => Promise.resolve({
    results: [
      {
        scheme: { id: '1', name: 'Test Scheme', color: '#000' },
        history: [],
        outcome: { final_value: 20000, total_return: 5000 }
      }
    ]
  })),
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
  Calendar: 'Calendar',
  TrendingUp: 'TrendingUp',
  Award: 'Award',
  Info: 'Info',
}));

describe('CurrentSchemeAnalysisScreen', () => {
  it('renders correctly', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <CurrentSchemeAnalysisScreen />
      </NavigationContainer>
    );

    expect(getByText('Current Scheme Analysis')).toBeTruthy();
    expect(getByText('Welcome to Your Analysis')).toBeTruthy();
  });
});
