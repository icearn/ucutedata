import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SettingsScreen } from '../SettingsScreen';
import { NavigationContainer } from '@react-navigation/native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock Navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      replace: mockNavigate,
    }),
  };
});

describe('SettingsScreen', () => {
  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <NavigationContainer>
        <SettingsScreen />
      </NavigationContainer>
    );

    expect(getByText('Setup Your KiwiSaver')).toBeTruthy();
    expect(getByPlaceholderText('Enter initial amount')).toBeTruthy();
  });

  it('updates initial funds input', () => {
    const { getByPlaceholderText } = render(
      <NavigationContainer>
        <SettingsScreen />
      </NavigationContainer>
    );

    const input = getByPlaceholderText('Enter initial amount');
    fireEvent.changeText(input, '50000');
    expect(input.props.value).toBe('50000');
  });
});
