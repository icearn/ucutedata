import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Calendar, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Card } from '../components/Card';
import { ScreenContainer } from '../components/ScreenContainer';
import { theme } from '../constants/theme';
import { getCurrentPrices, getTrends } from '../services/api';

type Period = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL';

type CurrentPriceFund = {
  scheme: string;
  current_unit_price: number;
  previous_unit_price: number;
  unit_change: number;
  percent_change: number;
};

type CurrentPricesResponse = {
  provider: string;
  latest_price_date: string;
  previous_price_date: string;
  funds: CurrentPriceFund[];
};

type TrendPoint = {
  date: string;
  unit_price: number;
};

const PERIOD_DAYS: Record<Period, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  '3Y': 365 * 3,
  '5Y': 365 * 5,
  ALL: 365 * 10,
};

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const subtractDays = (value: string, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() - days);
  return formatDate(next);
};

const formatLabel = (isoDate: string, period: Period) => {
  const date = new Date(isoDate);
  if (period === '1M' || period === '3M' || period === '6M') {
    return `${date.getDate()}/${date.getMonth() + 1}`;
  }
  return `${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}`;
};

export const HistoricalPricesScreen = () => {
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<Period>('3M');
  const [currentData, setCurrentData] = useState<CurrentPricesResponse | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFund = useMemo(
    () => currentData?.funds.find((fund) => fund.scheme === selectedScheme) ?? null,
    [currentData, selectedScheme]
  );

  const requestedStartDate = useMemo(() => {
    if (!currentData) {
      return null;
    }
    return subtractDays(currentData.latest_price_date, PERIOD_DAYS[period] - 1);
  }, [currentData, period]);

  const loadCurrentPrices = async (showRefreshState: boolean = false) => {
    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoadingSummary(true);
    }

    try {
      const response = await getCurrentPrices(14, true);
      setCurrentData(response);
      setSelectedScheme((current) => current ?? response.funds[0]?.scheme ?? null);
      setError(null);
    } catch (err) {
      setError('Unable to load live KiwiSaver prices right now.');
    } finally {
      setLoadingSummary(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCurrentPrices();
  }, []);

  useEffect(() => {
    let active = true;

    const loadTrend = async () => {
      if (!currentData || !selectedScheme) {
        return;
      }

      setLoadingTrend(true);
      try {
        const endDate = currentData.latest_price_date;
        const startDate = subtractDays(endDate, PERIOD_DAYS[period] - 1);
        const response = await getTrends(startDate, endDate, [selectedScheme], false);
        const points = response.series?.[0]?.points ?? [];
        if (!active) {
          return;
        }
        setTrendPoints(points);
        setError(null);
      } catch (err) {
        if (!active) {
          return;
        }
        setTrendPoints([]);
        setError('Unable to load the selected fund history.');
      } finally {
        if (active) {
          setLoadingTrend(false);
        }
      }
    };

    loadTrend();

    return () => {
      active = false;
    };
  }, [currentData, selectedScheme, period]);

  const chartData = useMemo(() => {
    if (!trendPoints.length) {
      return null;
    }

    const interval = Math.max(1, Math.floor(trendPoints.length / 6));
    return {
      labels: trendPoints.map((point, index) =>
        index % interval === 0 || index === trendPoints.length - 1 ? formatLabel(point.date, period) : ''
      ),
      datasets: [
        {
          data: trendPoints.map((point) => point.unit_price),
          color: () => theme.colors.primary,
          strokeWidth: 2,
        },
      ],
    };
  }, [trendPoints, period]);

  const chartSummary = useMemo(() => {
    if (!trendPoints.length) {
      return null;
    }

    const firstPoint = trendPoints[0];
    const lastPoint = trendPoints[trendPoints.length - 1];
    return {
      actualStart: firstPoint.date,
      actualEnd: lastPoint.date,
      pointCount: trendPoints.length,
    };
  }, [trendPoints]);

  const chartWidth = Math.min(width - 64, 960);
  const chartKey = useMemo(() => {
    const firstDate = trendPoints[0]?.date ?? 'none';
    const lastDate = trendPoints[trendPoints.length - 1]?.date ?? 'none';
    return `${selectedScheme ?? 'none'}-${period}-${firstDate}-${lastDate}-${trendPoints.length}`;
  }, [period, selectedScheme, trendPoints]);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCurrentPrices(true)} />}
      >
        <View style={styles.header}>
          <Text style={theme.typography.h2}>Live KiwiSaver Unit Prices</Text>
          <Text style={theme.typography.caption}>
            Current changes for ASB KiwiSaver funds, compared with the previous published snapshot.
          </Text>
        </View>

        {loadingSummary ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : null}

        {currentData ? (
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Calendar size={18} color={theme.colors.textSecondary} />
              <Text style={styles.summaryText}>
                Latest published date: {currentData.latest_price_date}
              </Text>
            </View>
            <Text style={styles.summarySubtext}>
              Previous snapshot: {currentData.previous_price_date} | Provider: {currentData.provider}
            </Text>
          </Card>
        ) : null}

        {selectedFund ? (
          <Card style={styles.heroCard}>
            <Text style={styles.heroLabel}>Selected Fund</Text>
            <Text style={styles.heroTitle}>{selectedFund.scheme}</Text>
            <Text style={styles.heroPrice}>${selectedFund.current_unit_price.toFixed(4)}</Text>
            <View style={styles.trendRow}>
              {selectedFund.unit_change >= 0 ? (
                <TrendingUp size={18} color={theme.colors.success} />
              ) : (
                <TrendingDown size={18} color={theme.colors.danger} />
              )}
              <Text
                style={[
                  styles.trendText,
                  {
                    color: selectedFund.unit_change >= 0 ? theme.colors.success : theme.colors.danger,
                  },
                ]}
              >
                {selectedFund.unit_change >= 0 ? '+' : ''}
                {selectedFund.unit_change.toFixed(4)} ({selectedFund.percent_change.toFixed(2)}%)
              </Text>
            </View>
            <Text style={styles.previousText}>
              Previous unit price: ${selectedFund.previous_unit_price.toFixed(4)}
            </Text>
          </Card>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
          {(['1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'] as Period[]).map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.periodButton, period === value && styles.periodButtonSelected]}
              onPress={() => setPeriod(value)}
            >
              <Text style={[styles.periodText, period === value && styles.periodTextSelected]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Card>
          <View style={styles.chartHeader}>
            <View style={styles.chartHeaderText}>
              <Text style={styles.sectionTitle}>Selected Fund Trend</Text>
              {requestedStartDate ? (
                <Text style={styles.chartSubtext}>
                  Requested window: {requestedStartDate} to {currentData?.latest_price_date}
                </Text>
              ) : null}
              {chartSummary ? (
                <Text style={styles.chartSubtext}>
                  Loaded range: {chartSummary.actualStart} to {chartSummary.actualEnd} ({chartSummary.pointCount} points)
                </Text>
              ) : null}
            </View>
            {loadingTrend ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
          </View>
          {chartData ? (
            <LineChart
              key={chartKey}
              data={chartData}
              width={chartWidth}
              height={220}
              withDots={false}
              withInnerLines={false}
              yAxisLabel="$"
              chartConfig={{
                backgroundColor: theme.colors.card,
                backgroundGradientFrom: theme.colors.card,
                backgroundGradientTo: theme.colors.card,
                decimalPlaces: 4,
                color: () => theme.colors.primary,
                labelColor: () => theme.colors.textSecondary,
                propsForDots: { r: '0' },
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <Text style={styles.emptyText}>No trend data is available for the selected fund yet.</Text>
          )}
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Fund Moves</Text>
          <Text style={styles.sectionCaption}>Tap a card to load its chart.</Text>
        </View>

        {currentData?.funds.map((fund) => {
          const isSelected = fund.scheme === selectedScheme;
          const positive = fund.unit_change >= 0;
          return (
            <TouchableOpacity key={fund.scheme} onPress={() => setSelectedScheme(fund.scheme)}>
              <Card style={[styles.fundCard, isSelected && styles.fundCardSelected]}>
                <View style={styles.fundHeader}>
                  <Text style={styles.fundName}>{fund.scheme}</Text>
                  <Text style={styles.fundPrice}>${fund.current_unit_price.toFixed(4)}</Text>
                </View>
                <View style={styles.fundFooter}>
                  <View style={styles.trendRow}>
                    {positive ? (
                      <TrendingUp size={16} color={theme.colors.success} />
                    ) : (
                      <TrendingDown size={16} color={theme.colors.danger} />
                    )}
                    <Text
                      style={[
                        styles.fundChange,
                        { color: positive ? theme.colors.success : theme.colors.danger },
                      ]}
                    >
                      {positive ? '+' : ''}
                      {fund.unit_change.toFixed(4)} ({fund.percent_change.toFixed(2)}%)
                    </Text>
                  </View>
                  <Text style={styles.previousText}>Prev: ${fund.previous_unit_price.toFixed(4)}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.m,
  },
  loader: {
    marginVertical: theme.spacing.l,
  },
  summaryCard: {
    marginBottom: theme.spacing.m,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  summarySubtext: {
    ...theme.typography.caption,
  },
  heroCard: {
    marginBottom: theme.spacing.m,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#F8FBFF',
  },
  heroLabel: {
    ...theme.typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    ...theme.typography.h3,
    marginTop: 4,
  },
  heroPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 10,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  trendText: {
    fontSize: 16,
    fontWeight: '600',
  },
  previousText: {
    ...theme.typography.caption,
    marginTop: 6,
  },
  periodScroll: {
    marginBottom: theme.spacing.m,
    maxHeight: 42,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  periodButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  periodText: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  periodTextSelected: {
    color: '#ffffff',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  chartHeaderText: {
    flex: 1,
  },
  chartSubtext: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionHeader: {
    marginTop: theme.spacing.l,
    marginBottom: theme.spacing.s,
  },
  sectionTitle: {
    ...theme.typography.h3,
  },
  sectionCaption: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  fundCard: {
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fundCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EFF6FF',
  },
  fundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  fundName: {
    flex: 1,
    ...theme.typography.body,
    fontWeight: '600',
  },
  fundPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  fundFooter: {
    marginTop: 8,
  },
  fundChange: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    ...theme.typography.caption,
    paddingVertical: theme.spacing.m,
  },
  errorText: {
    color: theme.colors.danger,
    marginTop: theme.spacing.m,
  },
});
