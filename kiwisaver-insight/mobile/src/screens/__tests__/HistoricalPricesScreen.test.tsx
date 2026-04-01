import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HistoricalPricesScreen } from '../HistoricalPricesScreen';

const mockGetCurrentPrices = jest.fn();
const mockGetTrends = jest.fn();

jest.mock('../../services/api', () => ({
  getCurrentPrices: (...args: any[]) => mockGetCurrentPrices(...args),
  getTrends: (...args: any[]) => mockGetTrends(...args),
}));

jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
}));

jest.mock('lucide-react-native', () => ({
  Calendar: 'Calendar',
  TrendingDown: 'TrendingDown',
  TrendingUp: 'TrendingUp',
}));

const subtractDays = (value: string, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() - days);
  return next.toISOString().slice(0, 10);
};

describe('HistoricalPricesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetCurrentPrices.mockResolvedValue({
      provider: 'ASB',
      latest_price_date: '2026-03-30',
      previous_price_date: '2026-03-27',
      funds: [
        {
          scheme: 'Aggressive Fund',
          current_unit_price: 1.3643,
          previous_unit_price: 1.3661,
          unit_change: -0.0018,
          percent_change: -0.1318,
        },
      ],
    });

    mockGetTrends.mockImplementation((startDate: string, endDate: string) =>
      Promise.resolve({
        series: [
          {
            points: [
              { date: startDate, unit_price: 1.1 },
              { date: endDate, unit_price: 1.2 },
            ],
          },
        ],
      })
    );
  });

  it('reloads the trend range when the selected period changes', async () => {
    const { getByText, findByText } = render(<HistoricalPricesScreen />);

    const defaultStart = subtractDays('2026-03-30', 89);
    await waitFor(() => {
      expect(mockGetTrends).toHaveBeenLastCalledWith(
        defaultStart,
        '2026-03-30',
        ['Aggressive Fund'],
        false
      );
    });

    expect(await findByText(`Loaded range: ${defaultStart} to 2026-03-30 (2 points)`)).toBeTruthy();

    fireEvent.press(getByText('1M'));
    const oneMonthStart = subtractDays('2026-03-30', 29);

    await waitFor(() => {
      expect(mockGetTrends).toHaveBeenLastCalledWith(
        oneMonthStart,
        '2026-03-30',
        ['Aggressive Fund'],
        false
      );
    });

    expect(await findByText(`Loaded range: ${oneMonthStart} to 2026-03-30 (2 points)`)).toBeTruthy();

    fireEvent.press(getByText('6M'));
    const sixMonthStart = subtractDays('2026-03-30', 179);

    await waitFor(() => {
      expect(mockGetTrends).toHaveBeenLastCalledWith(
        sixMonthStart,
        '2026-03-30',
        ['Aggressive Fund'],
        false
      );
    });

    expect(await findByText(`Loaded range: ${sixMonthStart} to 2026-03-30 (2 points)`)).toBeTruthy();
  });
});
