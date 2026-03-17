import React from 'react';
import { render } from '@testing-library/react-native';
import { StatCard } from '../StatCard';
import { Wallet } from 'lucide-react-native';

describe('StatCard', () => {
  it('renders correctly with label and value', () => {
    const { getByText } = render(
      <StatCard
        icon={Wallet}
        label="Total Balance"
        value="$1,000"
      />
    );

    expect(getByText('Total Balance')).toBeTruthy();
    expect(getByText('$1,000')).toBeTruthy();
  });

  it('renders change percentage correctly when positive', () => {
    const { getByText } = render(
      <StatCard
        icon={Wallet}
        label="Savings"
        value="$500"
        change={10}
      />
    );

    expect(getByText('+10%')).toBeTruthy();
  });

  it('renders change percentage correctly when negative', () => {
    const { getByText } = render(
      <StatCard
        icon={Wallet}
        label="Expenses"
        value="$200"
        change={-5}
      />
    );

    expect(getByText('-5%')).toBeTruthy();
  });
});
