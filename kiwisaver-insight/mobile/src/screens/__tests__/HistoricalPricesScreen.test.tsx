import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HistoricalPricesScreen } from '../HistoricalPricesScreen';

const mockGetCurrentPrices = jest.fn();
const mockGetTrends = jest.fn();
const mockGetAlertRules = jest.fn();
const mockCreateAlertRule = jest.fn();
const mockGetOrCreateLocalUserId = jest.fn();

jest.mock('../../services/api', () => ({
  getProviderCurrentPrices: (...args: any[]) => mockGetCurrentPrices(...args),
  getProviderTrends: (...args: any[]) => mockGetTrends(...args),
  getAlertRules: (...args: any[]) => mockGetAlertRules(...args),
  createAlertRule: (...args: any[]) => mockCreateAlertRule(...args),
}));

jest.mock('../../services/user', () => ({
  getOrCreateLocalUserId: (...args: any[]) => mockGetOrCreateLocalUserId(...args),
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

    mockGetCurrentPrices.mockImplementation((provider: string) =>
      Promise.resolve(
        provider === 'ANZ'
          ? {
              provider: 'ANZ',
              latest_price_date: '2026-03-28',
              previous_price_date: '2026-03-27',
              funds: [
                {
                  scheme: 'Cash Fund',
                  current_unit_price: 1.0123,
                  previous_unit_price: 1.012,
                  unit_change: 0.0003,
                  percent_change: 0.0296,
                },
                {
                  scheme: 'Growth Fund',
                  current_unit_price: 2.205,
                  previous_unit_price: 2.198,
                  unit_change: 0.007,
                  percent_change: 0.3185,
                },
              ],
            }
          : {
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
                {
                  scheme: 'Growth Fund',
                  current_unit_price: 1.205,
                  previous_unit_price: 1.198,
                  unit_change: 0.007,
                  percent_change: 0.5843,
                },
              ],
            }
      )
    );

    mockGetTrends.mockImplementation((provider: string, startDate: string, endDate: string, schemes?: string[]) =>
      Promise.resolve({
        series: [
          {
            points:
              provider === 'ANZ'
                ? [
                    { date: startDate, unit_price: 1.0 },
                    { date: subtractDays(endDate, 5), unit_price: 1.005 },
                    { date: endDate, unit_price: schemes?.[0] === 'Growth Fund' ? 2.205 : 1.0123 },
                  ]
                : schemes?.[0] === 'Growth Fund'
                ? [
                    { date: startDate, unit_price: 1.15 },
                    { date: subtractDays(endDate, 10), unit_price: 1.18 },
                    { date: endDate, unit_price: 1.205 },
                  ]
                : [
                    { date: startDate, unit_price: 1.1 },
                    { date: subtractDays(endDate, 10), unit_price: 1.18 },
                    { date: endDate, unit_price: 1.2 },
                  ],
          },
        ],
      })
    );

    mockGetAlertRules.mockResolvedValue({ rules: [] });
    mockGetOrCreateLocalUserId.mockResolvedValue('local-user-1');
    mockCreateAlertRule.mockResolvedValue({
      id: 1,
      provider: 'ASB',
      scheme: 'Aggressive Fund',
      metric: 'unit_price',
      comparison: 'gte',
      target_value: 1.4,
      reference_price: null,
      is_active: true,
      trigger_once: true,
      triggered_at: null,
    });
  });

  it('reloads the trend range when the selected period changes', async () => {
    const { getByText, findByText } = render(<HistoricalPricesScreen />);

    const defaultStart = subtractDays('2026-03-30', 89);
    await waitFor(() => {
      expect(mockGetTrends).toHaveBeenLastCalledWith(
        'ASB',
        defaultStart,
        '2026-03-30',
        ['Aggressive Fund'],
        false
      );
    });

    expect(await findByText(`Loaded range: ${defaultStart} to 2026-03-30 (3 points)`)).toBeTruthy();

    fireEvent.press(getByText('1M'));
    const oneMonthStart = subtractDays('2026-03-30', 29);

    await waitFor(() => {
      expect(mockGetTrends).toHaveBeenLastCalledWith(
        'ASB',
        oneMonthStart,
        '2026-03-30',
        ['Aggressive Fund'],
        false
      );
    });

    expect(await findByText(`Loaded range: ${oneMonthStart} to 2026-03-30 (3 points)`)).toBeTruthy();

    fireEvent.press(getByText('6M'));
    const sixMonthStart = subtractDays('2026-03-30', 179);

    await waitFor(() => {
      expect(mockGetTrends).toHaveBeenLastCalledWith(
        'ASB',
        sixMonthStart,
        '2026-03-30',
        ['Aggressive Fund'],
        false
      );
    });

    expect(await findByText(`Loaded range: ${sixMonthStart} to 2026-03-30 (3 points)`)).toBeTruthy();
  });

  it('switches the selected fund and reloads the trend for the new fund', async () => {
    const { getByTestId, findByText } = render(<HistoricalPricesScreen />);

    const defaultStart = subtractDays('2026-03-30', 89);
    await waitFor(() => {
      expect(mockGetTrends).toHaveBeenLastCalledWith(
        'ASB',
        defaultStart,
        '2026-03-30',
        ['Aggressive Fund'],
        false
      );
    });

    fireEvent.press(getByTestId('fund-switch-growth-fund'));

    await waitFor(() => {
      expect(mockGetTrends).toHaveBeenLastCalledWith(
        'ASB',
        defaultStart,
        '2026-03-30',
        ['Growth Fund'],
        false
      );
    });

    expect(await findByText('Growth Fund Trend')).toBeTruthy();
    expect(await findByText(`Loaded range: ${defaultStart} to 2026-03-30 (3 points)`)).toBeTruthy();
  });

  it('switches provider and reloads provider-specific funds and trends', async () => {
    const { getByText, findByText } = render(<HistoricalPricesScreen />);

    await waitFor(() => {
      expect(mockGetCurrentPrices).toHaveBeenCalledWith('ASB', 14, true);
    });

    fireEvent.press(getByText('ANZ'));

    await waitFor(() => {
      expect(mockGetCurrentPrices).toHaveBeenLastCalledWith('ANZ', 14, true);
      expect(mockGetTrends).toHaveBeenLastCalledWith(
        'ANZ',
        subtractDays('2026-03-28', 89),
        '2026-03-28',
        ['Cash Fund'],
        false
      );
    });

    expect(await findByText('Cash Fund Trend')).toBeTruthy();
    expect(await findByText('Previous snapshot: 2026-03-27 | Provider: ANZ')).toBeTruthy();
  });

  it('shows a tooltip with the hovered historical price', async () => {
    const { getByTestId, findByText } = render(<HistoricalPricesScreen />);

    await waitFor(() => {
      expect(getByTestId('historical-chart-hit-1')).toBeTruthy();
    });

    fireEvent(getByTestId('historical-chart-hit-1'), 'pressIn');

    expect(await findByText('2026-03-20')).toBeTruthy();
    expect(await findByText('$1.1800')).toBeTruthy();
  });

  it('creates an alert for the selected fund', async () => {
    const { getByText, getByPlaceholderText, findByText } = render(<HistoricalPricesScreen />);

    await waitFor(() => {
      expect(mockGetAlertRules).toHaveBeenCalledWith('local-user-1', true);
    });

    fireEvent.changeText(getByPlaceholderText('e.g. 1.2500'), '1.4');
    fireEvent.press(getByText('Create Alert'));

    await waitFor(() => {
      expect(mockCreateAlertRule).toHaveBeenCalledWith({
        user_id: 'local-user-1',
        provider: 'ASB',
        scheme: 'Aggressive Fund',
        metric: 'unit_price',
        comparison: 'gte',
        target_value: 1.4,
        channel: 'common_api',
        trigger_once: true,
      });
    });

    expect(await findByText('Aggressive Fund alert created: >= 1.4')).toBeTruthy();
  });
});
