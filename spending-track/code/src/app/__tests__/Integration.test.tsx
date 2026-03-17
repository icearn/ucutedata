import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../(tabs)/index';
import AddTransactionScreen from '../add-transaction';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  useFocusEffect: (cb: any) => cb(),
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, style }: any) => <>{children}</>,
}));

// Mock DB service
jest.mock('../../db/transactions', () => ({
  getTransactions: jest.fn(() => Promise.resolve([
    {
      id: '1',
      title: 'Test Transaction',
      amount: 100,
      category: 'Food',
      date: 'Today',
      isFavorite: false,
    }
  ])),
  addTransaction: jest.fn(() => Promise.resolve('new-id')),
  toggleFavorite: jest.fn(),
}));

describe('Integration Tests', () => {
  it('renders Home Screen with key elements', async () => {
    const { getByText, findByText } = render(<HomeScreen />);
    
    expect(getByText('Total Balance')).toBeTruthy();
    expect(getByText('Recent Transactions')).toBeTruthy();
    expect(getByText('Add Receipt')).toBeTruthy();
    
    // Check if mocked transaction is rendered
    const transaction = await findByText('Test Transaction');
    expect(transaction).toBeTruthy();
  });

  it('renders Add Transaction Screen and handles input', () => {
    const { getByPlaceholderText, getByText } = render(<AddTransactionScreen />);
    
    const amountInput = getByPlaceholderText('0.00');
    fireEvent.changeText(amountInput, '123.45');
    
    const titleInput = getByPlaceholderText('What is this for?');
    fireEvent.changeText(titleInput, 'Lunch');
    
    expect(getByText('Save Transaction')).toBeTruthy();
  });
});
