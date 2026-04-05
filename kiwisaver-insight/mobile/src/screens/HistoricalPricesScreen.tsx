import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Calendar, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ScreenContainer } from '../components/ScreenContainer';
import { SCHEME_PROVIDERS } from '../constants/schemes';
import { theme } from '../constants/theme';
import {
  createAlertRule,
  getAlertRules,
  getProviderCurrentPrices,
  getProviderTrends,
} from '../services/api';
import { getOrCreateLocalUserId } from '../services/user';

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
  source?: 'live' | 'db_fallback';
  warning?: string;
};

type TrendPoint = {
  date: string;
  unit_price: number;
};

type AlertMetric = 'unit_price' | 'percent_change';
type AlertComparison = 'gte' | 'lte' | 'eq';

type AlertRule = {
  id: number;
  provider: string;
  scheme: string;
  metric: AlertMetric;
  comparison: AlertComparison;
  target_value: number;
  reference_price: number | null;
  is_active: boolean;
  trigger_once: boolean;
  triggered_at: string | null;
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const HistoricalTrendChart = ({
  width,
  points,
  period,
}: {
  width: number;
  points: TrendPoint[];
  period: Period;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartHeight = 220;
  const paddingLeft = 52;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 36;
  const plotWidth = Math.max(1, width - paddingLeft - paddingRight);
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const values = points.map((point) => point.unit_price);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minValue = rawMin === rawMax ? rawMin - 1 : rawMin;
  const maxValue = rawMin === rawMax ? rawMax + 1 : rawMax;
  const valueRange = maxValue - minValue || 1;
  const xStep = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = maxValue - ratio * valueRange;
    const y = paddingTop + ratio * plotHeight;
    return { value, y };
  });
  const labelInterval = Math.max(1, Math.ceil(points.length / 6));
  const tooltipWidth = 180;

  const xForIndex = (index: number) => paddingLeft + index * xStep;
  const yForValue = (value: number) => paddingTop + ((maxValue - value) / valueRange) * plotHeight;
  const hoveredPoint = hoveredIndex != null ? points[hoveredIndex] ?? null : null;
  const hoveredX = hoveredIndex != null ? xForIndex(hoveredIndex) : null;
  const tooltipLeft =
    hoveredX == null
      ? paddingLeft
      : clamp(hoveredX - tooltipWidth / 2, paddingLeft, width - paddingRight - tooltipWidth);

  return (
    <View style={[styles.chartFrame, { width, height: chartHeight }]}>
      <Svg width={width} height={chartHeight}>
        {yTicks.map((tick) => (
          <React.Fragment key={`history-y-${tick.y}`}>
            <Line
              x1={paddingLeft}
              y1={tick.y}
              x2={width - paddingRight}
              y2={tick.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <SvgText x={paddingLeft - 8} y={tick.y + 4} fontSize="11" fill="#64748b" textAnchor="end">
              ${tick.value.toFixed(4)}
            </SvgText>
          </React.Fragment>
        ))}

        <Line
          x1={paddingLeft}
          y1={paddingTop + plotHeight}
          x2={width - paddingRight}
          y2={paddingTop + plotHeight}
          stroke="#94a3b8"
          strokeWidth="1"
        />

        {hoveredX != null ? (
          <Line
            x1={hoveredX}
            y1={paddingTop}
            x2={hoveredX}
            y2={paddingTop + plotHeight}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ) : null}

        {points
          .filter((_, index) => index % labelInterval === 0 || index === points.length - 1)
          .map((point, index, source) => {
            const originalIndex = points.findIndex((candidate) => candidate.date === point.date);
            return (
              <SvgText
                key={`history-x-${point.date}-${index}-${source.length}`}
                x={xForIndex(originalIndex)}
                y={chartHeight - 10}
                fontSize="11"
                fill="#64748b"
                textAnchor="middle"
              >
                {formatLabel(point.date, period)}
              </SvgText>
            );
          })}

        <Polyline
          points={points.map((point, index) => `${xForIndex(index)},${yForValue(point.unit_price)}`).join(' ')}
          fill="none"
          stroke={theme.colors.primary}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hoveredPoint && hoveredIndex != null ? (
          <Circle cx={xForIndex(hoveredIndex)} cy={yForValue(hoveredPoint.unit_price)} r="4" fill={theme.colors.primary} />
        ) : null}
      </Svg>

      <View style={styles.chartHitArea} pointerEvents="box-none">
        {points.map((point, index) => {
          const x = xForIndex(index);
          const left = index === 0 ? paddingLeft : x - xStep / 2;
          const right = index === points.length - 1 ? width - paddingRight : x + xStep / 2;
          return (
            <Pressable
              key={`history-hit-${point.date}-${index}`}
              testID={`historical-chart-hit-${index}`}
              style={[
                styles.chartHitBox,
                {
                  left,
                  top: paddingTop,
                  width: Math.max(right - left, 8),
                  height: plotHeight,
                },
              ]}
              onHoverIn={() => setHoveredIndex(index)}
              onHoverOut={() => setHoveredIndex((current) => (current === index ? null : current))}
              onPressIn={() => setHoveredIndex(index)}
              onPressOut={() => setHoveredIndex((current) => (current === index ? null : current))}
            />
          );
        })}
      </View>

      {hoveredPoint ? (
        <View style={[styles.chartTooltip, { left: tooltipLeft, top: paddingTop + 8 }]}>
          <Text style={styles.chartTooltipTitle}>{hoveredPoint.date}</Text>
          <Text style={styles.chartTooltipValue}>${hoveredPoint.unit_price.toFixed(4)}</Text>
        </View>
      ) : null}
    </View>
  );
};

export const HistoricalPricesScreen = () => {
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<Period>('3M');
  const [selectedProvider, setSelectedProvider] = useState<string>('ASB');
  const [currentData, setCurrentData] = useState<CurrentPricesResponse | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertMetric, setAlertMetric] = useState<AlertMetric>('unit_price');
  const [alertComparison, setAlertComparison] = useState<AlertComparison>('gte');
  const [alertTarget, setAlertTarget] = useState('');
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);
  const [localUserId, setLocalUserId] = useState<string | null>(null);

  const selectedFund = useMemo(
    () => currentData?.funds.find((fund) => fund.scheme === selectedScheme) ?? null,
    [currentData, selectedScheme]
  );

  const orderedFunds = useMemo(() => {
    if (!currentData?.funds.length) {
      return [];
    }

    return [...currentData.funds].sort((left, right) => {
      if (left.scheme === selectedScheme) {
        return -1;
      }
      if (right.scheme === selectedScheme) {
        return 1;
      }
      return right.current_unit_price - left.current_unit_price;
    });
  }, [currentData, selectedScheme]);

  const selectedFundAlerts = useMemo(() => {
    if (!currentData || !selectedFund) {
      return [];
    }

    return alertRules.filter(
      (rule) => rule.provider === currentData.provider && rule.scheme === selectedFund.scheme
    );
  }, [alertRules, currentData, selectedFund]);

  const requestedStartDate = useMemo(() => {
    if (!currentData) {
      return null;
    }
    return subtractDays(currentData.latest_price_date, PERIOD_DAYS[period] - 1);
  }, [currentData, period]);

  const loadCurrentPrices = async (provider: string, showRefreshState: boolean = false) => {
    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoadingSummary(true);
      setCurrentData(null);
      setTrendPoints([]);
    }

    try {
      const response = await getProviderCurrentPrices(provider, 14, true);
      setCurrentData(response);
      setSelectedScheme((current) => {
        if (current && response.funds.some((fund) => fund.scheme === current)) {
          return current;
        }
        return response.funds[0]?.scheme ?? null;
      });
      setError(null);
    } catch (err) {
      setCurrentData(null);
      setSelectedScheme(null);
      setError('Unable to load live KiwiSaver prices right now.');
    } finally {
      setLoadingSummary(false);
      setRefreshing(false);
    }
  };

  const loadAlertRules = async (userId: string) => {
    try {
      const response = await getAlertRules(userId, true);
      setAlertRules(response.rules ?? []);
    } catch (err) {
      setAlertFeedback('Alert rules could not be refreshed right now.');
    }
  };

  useEffect(() => {
    loadCurrentPrices(selectedProvider);
  }, [selectedProvider]);

  useEffect(() => {
    let active = true;

    const initialiseLocalUser = async () => {
      try {
        const userId = await getOrCreateLocalUserId();
        if (!active) {
          return;
        }
        setLocalUserId(userId);
      } catch (err) {
        if (active) {
          setAlertFeedback('Local user profile could not be initialized.');
        }
      }
    };

    initialiseLocalUser();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!localUserId) {
      return;
    }
    loadAlertRules(localUserId);
  }, [localUserId]);

  useEffect(() => {
    let active = true;

    const loadTrend = async () => {
      if (!currentData || !selectedScheme) {
        return;
      }

      setLoadingTrend(true);
      setTrendPoints([]);
      try {
        const endDate = currentData.latest_price_date;
        const startDate = subtractDays(endDate, PERIOD_DAYS[period] - 1);
        const response = await getProviderTrends(currentData.provider, startDate, endDate, [selectedScheme], false);
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
  const alertTargetLabel = alertMetric === 'percent_change' ? 'Target Move (%)' : 'Target Unit Price';
  const alertHint =
    alertMetric === 'percent_change'
      ? 'Percent alerts use the current selected fund price as the reference baseline when the alert is created.'
      : 'Price alerts compare the latest published unit price directly against your target.';

  const formatAlertRule = (rule: AlertRule) => {
    const symbol = rule.comparison === 'gte' ? '>=' : rule.comparison === 'lte' ? '<=' : '=';
    const suffix = rule.metric === 'percent_change' ? '%' : '';
    const reference = rule.reference_price != null ? ` from ${rule.reference_price.toFixed(4)}` : '';
    return `${symbol} ${rule.target_value.toFixed(4)}${suffix}${reference}`;
  };

  const submitAlertRule = async () => {
    if (!currentData || !selectedFund) {
      setAlertFeedback('Select a fund before creating an alert.');
      return;
    }
    if (!localUserId) {
      setAlertFeedback('Local user profile is still loading. Try again in a moment.');
      return;
    }

    const parsedTarget = Number(alertTarget);
    if (!Number.isFinite(parsedTarget)) {
      setAlertFeedback('Enter a valid numeric target for the alert.');
      return;
    }

    setSavingAlert(true);
    try {
      await createAlertRule({
        user_id: localUserId,
        provider: currentData.provider,
        scheme: selectedFund.scheme,
        metric: alertMetric,
        comparison: alertComparison,
        target_value: parsedTarget,
        channel: 'common_api',
        trigger_once: true,
      });
      await loadAlertRules(localUserId);
      setAlertTarget('');
      setAlertFeedback(
        `${selectedFund.scheme} alert created: ${alertComparison === 'gte' ? '>=' : alertComparison === 'lte' ? '<=' : '='} ${parsedTarget}`
      );
    } catch (err) {
      setAlertFeedback('Creating the alert failed. Check that the backend alert API is reachable.');
    } finally {
      setSavingAlert(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadCurrentPrices(selectedProvider, true)} />
        }
      >
        <View style={styles.header}>
          <Text style={theme.typography.h2}>Live KiwiSaver Unit Prices</Text>
          <Text style={theme.typography.caption}>
            Current changes for the selected provider's KiwiSaver funds, compared with the previous published snapshot.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Switch Provider</Text>
          <Text style={styles.sectionCaption}>Choose a provider before switching between that provider's funds.</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerScroll}>
          {SCHEME_PROVIDERS.map((provider) => {
            const isSelected = provider === selectedProvider;
            return (
              <TouchableOpacity
                key={provider}
                style={[styles.providerChip, isSelected && styles.providerChipSelected]}
                onPress={() => setSelectedProvider(provider)}
              >
                <Text style={[styles.providerChipText, isSelected && styles.providerChipTextSelected]}>{provider}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
            {currentData.warning ? (
              <Text style={styles.warningText}>
                {currentData.warning}
              </Text>
            ) : null}
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

        {selectedFund ? (
          <Card style={styles.alertCard}>
            <Text style={styles.sectionTitle}>Alert Monitor</Text>
            <Text style={styles.alertSubtext}>
              Create a one-time alert for {selectedFund.scheme}. The scheduler evaluates active rules after each provider
              update and records a notification event when the condition is met.
            </Text>

            <Text style={styles.alertLabel}>Metric</Text>
            <View style={styles.alertChipRow}>
              {([
                { value: 'unit_price', label: 'Unit Price' },
                { value: 'percent_change', label: '% Move' },
              ] as { value: AlertMetric; label: string }[]).map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.alertChip, alertMetric === item.value && styles.alertChipSelected]}
                  onPress={() => setAlertMetric(item.value)}
                >
                  <Text style={[styles.alertChipText, alertMetric === item.value && styles.alertChipTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.alertLabel}>Comparison</Text>
            <View style={styles.alertChipRow}>
              {([
                { value: 'gte', label: '>=' },
                { value: 'lte', label: '<=' },
                { value: 'eq', label: '=' },
              ] as { value: AlertComparison; label: string }[]).map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.alertChip, alertComparison === item.value && styles.alertChipSelected]}
                  onPress={() => setAlertComparison(item.value)}
                >
                  <Text
                    style={[styles.alertChipText, alertComparison === item.value && styles.alertChipTextSelected]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label={alertTargetLabel}
              keyboardType="numeric"
              value={alertTarget}
              onChangeText={setAlertTarget}
              placeholder={alertMetric === 'percent_change' ? 'e.g. 5 for +5%' : 'e.g. 1.2500'}
            />
            <Text style={styles.alertSubtext}>{alertHint}</Text>

            <Button title="Create Alert" onPress={submitAlertRule} loading={savingAlert} disabled={!selectedFund} />

            {selectedFundAlerts.length > 0 ? (
              <View style={styles.activeAlertsSection}>
                <Text style={styles.alertLabel}>Active Alerts For This Fund</Text>
                {selectedFundAlerts.map((rule) => (
                  <View key={rule.id} style={styles.activeAlertRow}>
                    <Text style={styles.activeAlertText}>{formatAlertRule(rule)}</Text>
                    <Text style={styles.activeAlertMeta}>
                      {rule.triggered_at ? 'Triggered' : 'Waiting'} | {rule.metric === 'percent_change' ? '% move' : 'price'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {alertFeedback ? <Text style={styles.alertFeedback}>{alertFeedback}</Text> : null}
          </Card>
        ) : null}

        {orderedFunds.length > 0 ? (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Switch Fund</Text>
            <Text style={styles.sectionCaption}>Choose a fund to update the live price card and trend chart.</Text>
          </View>
        ) : null}

        {orderedFunds.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fundSwitchScroll}>
            {orderedFunds.map((fund) => {
              const isSelected = fund.scheme === selectedScheme;
              const positive = fund.unit_change >= 0;
              return (
                <TouchableOpacity
                  key={`switch-${fund.scheme}`}
                  testID={`fund-switch-${fund.scheme.replace(/\s+/g, '-').toLowerCase()}`}
                  style={[styles.fundSwitchChip, isSelected && styles.fundSwitchChipSelected]}
                  onPress={() => setSelectedScheme(fund.scheme)}
                >
                  <Text style={[styles.fundSwitchName, isSelected && styles.fundSwitchNameSelected]}>
                    {fund.scheme}
                  </Text>
                  <Text
                    style={[
                      styles.fundSwitchChange,
                      {
                        color: positive ? theme.colors.success : theme.colors.danger,
                      },
                    ]}
                  >
                    {positive ? '+' : ''}
                    {fund.percent_change.toFixed(2)}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
              <Text style={styles.sectionTitle}>
                {selectedFund ? `${selectedFund.scheme} Trend` : 'Selected Fund Trend'}
              </Text>
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
          {trendPoints.length > 0 ? (
            <HistoricalTrendChart width={chartWidth} points={trendPoints} period={period} />
          ) : (
            <Text style={styles.emptyText}>No trend data is available for the selected fund yet.</Text>
          )}
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Fund Moves</Text>
          <Text style={styles.sectionCaption}>Tap a chip or card to switch funds.</Text>
        </View>

        {orderedFunds.map((fund) => {
          const isSelected = fund.scheme === selectedScheme;
          const positive = fund.unit_change >= 0;
          return (
            <TouchableOpacity
              key={`card-${fund.scheme}`}
              testID={`fund-card-${fund.scheme.replace(/\s+/g, '-').toLowerCase()}`}
              onPress={() => setSelectedScheme(fund.scheme)}
            >
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
  alertCard: {
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FCFDFF',
  },
  alertLabel: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: theme.spacing.s,
  },
  alertSubtext: {
    ...theme.typography.caption,
    marginTop: 6,
  },
  alertChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  alertChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  alertChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EFF6FF',
  },
  alertChipText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
  },
  alertChipTextSelected: {
    color: theme.colors.primary,
  },
  activeAlertsSection: {
    marginTop: theme.spacing.s,
  },
  activeAlertRow: {
    marginTop: 8,
    padding: 12,
    borderRadius: theme.borderRadius.m,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeAlertText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  activeAlertMeta: {
    ...theme.typography.caption,
    marginTop: 4,
  },
  alertFeedback: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginTop: 8,
  },
  providerScroll: {
    marginBottom: theme.spacing.m,
    maxHeight: 48,
  },
  providerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  providerChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  providerChipText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  providerChipTextSelected: {
    color: '#ffffff',
  },
  fundSwitchScroll: {
    marginBottom: theme.spacing.m,
    maxHeight: 72,
  },
  fundSwitchChip: {
    minWidth: 176,
    marginRight: theme.spacing.s,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fundSwitchChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EFF6FF',
  },
  fundSwitchName: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  fundSwitchNameSelected: {
    color: theme.colors.primary,
  },
  fundSwitchChange: {
    ...theme.typography.caption,
    marginTop: 6,
    fontWeight: '600',
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
  chartFrame: {
    position: 'relative',
  },
  chartHitArea: {
    ...StyleSheet.absoluteFillObject,
  },
  chartHitBox: {
    position: 'absolute',
  },
  chartTooltip: {
    position: 'absolute',
    width: 180,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  chartTooltipTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  chartTooltipValue: {
    color: '#cbd5e1',
    fontSize: 12,
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
  warningText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    marginTop: 8,
  },
});
