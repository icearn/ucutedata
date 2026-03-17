import React from 'react';
import { render } from '@testing-library/react-native';
import { TransactionCard } from '../TransactionCard';

describe('TransactionCard', () => {
  const mockTransaction = {
    id: '1',
    title: 'Grocery Store',
    category: 'Food',
    amount: 50.00,
    date: 'Today',
    location: 'Downtown',
    isFavorite: false,
  };

  it('renders transaction details correctly', () => {
    const { getByText } = render(
      <TransactionCard transaction={mockTransaction} />
    );

    expect(getByText('Grocery Store')).toBeTruthy();
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('$50.00')).toBeTruthy();
    expect(getByText('Downtown')).toBeTruthy();
  });

  it('renders favorite star when isFavorite is true', () => {
    const favoriteTransaction = { ...mockTransaction, isFavorite: true };
    const { toJSON } = render(
      <TransactionCard transaction={favoriteTransaction} />
    );
    // Snapshot testing or checking for specific style/icon presence would be ideal here
    // For now, basic render check is sufficient
    expect(toJSON()).toMatchSnapshot();
  });
});
