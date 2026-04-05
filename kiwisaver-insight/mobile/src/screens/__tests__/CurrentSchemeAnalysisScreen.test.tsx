import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
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
        scheme: { id: '1', name: 'ANZ KiwiSaver Conservative Fund', color: '#2563eb' },
        history: [
          { date: '2026-01-31', price: 1.01, timestamp: 1 },
          { date: '2026-02-28', price: 1.03, timestamp: 2 },
          { date: '2026-03-31', price: 1.05, timestamp: 3 },
        ],
        history_window: {
          available_start: '2026-01-31',
          available_end: '2026-03-31',
          point_count: 3,
        },
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
    const view = render(
      <NavigationContainer>
        <CurrentSchemeAnalysisScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(view.getByText('Current Scheme Analysis')).toBeTruthy();
      expect(view.getByText('Welcome to Your Analysis')).toBeTruthy();
      expect(view.getByText('1/5 selected')).toBeTruthy();
    });
  });

  it('shows a tooltip when a chart point is pressed', async () => {
    const view = render(
      <NavigationContainer>
        <CurrentSchemeAnalysisScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(view.getByTestId('analysis-chart-hit-2026-02')).toBeTruthy();
    });

    fireEvent(view.getByTestId('analysis-chart-hit-2026-02'), 'pressIn');

    expect(view.getByText('2026-02')).toBeTruthy();
    expect(view.getByText('$1.0300')).toBeTruthy();
  });
});
