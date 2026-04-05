import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { fetchCurrentSchemeAnalysis } from '../services/api';
import { theme } from '../constants/theme';
import { SchemeData, TimePeriod } from '../types';
import { Award, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ANALYSIS_SCHEMES, SCHEME_PROVIDERS, SCHEME_RISK_LEVELS } from '../constants/schemes';

const ALL_PROVIDERS = 'All Providers';
const ALL_RISK_LEVELS = 'All Risk Levels';
const MAX_SELECTED_SCHEMES = 4;

type SchemeGroup = {
  key: string;
  title: string;
  subtitle: string;
  schemes: SchemeData[];
};

const PERIODS: { label: string; value: TimePeriod; years: number }[] = [
  { label: '1Y', value: '1Y', years: 1 },
  { label: '3Y', value: '3Y', years: 3 },
  { label: '5Y', value: '5Y', years: 5 },
  { label: '10Y', value: '10Y', years: 10 },
];

const groupSchemes = (
  schemes: SchemeData[],
  selectedProvider: string,
  selectedRisk: string
): SchemeGroup[] => {
  if (schemes.length === 0) {
    return [];
  }

  if (selectedProvider !== ALL_PROVIDERS && selectedRisk === ALL_RISK_LEVELS) {
    return SCHEME_RISK_LEVELS
      .map((riskLevel) => {
        const items = schemes.filter((scheme) => scheme.type === riskLevel);
        return items.length
          ? {
              key: `risk-${riskLevel}`,
              title: riskLevel,
              subtitle: `${selectedProvider} funds`,
              schemes: items,
            }
          : null;
      })
      .filter((group): group is SchemeGroup => Boolean(group));
  }

  if (selectedProvider === ALL_PROVIDERS && selectedRisk !== ALL_RISK_LEVELS) {
    return SCHEME_PROVIDERS
      .map((provider) => {
        const items = schemes.filter((scheme) => scheme.provider === provider);
        return items.length
          ? {
              key: `provider-${provider}`,
              title: provider,
              subtitle: `${selectedRisk} funds`,
              schemes: items,
            }
          : null;
      })
      .filter((group): group is SchemeGroup => Boolean(group));
  }

  if (selectedProvider === ALL_PROVIDERS && selectedRisk === ALL_RISK_LEVELS) {
    return SCHEME_PROVIDERS
      .map((provider) => {
        const items = schemes.filter((scheme) => scheme.provider === provider);
        return items.length
          ? {
              key: `provider-${provider}`,
              title: provider,
              subtitle: 'All available risk levels',
              schemes: items,
            }
          : null;
      })
      .filter((group): group is SchemeGroup => Boolean(group));
  }

  return [
    {
      key: `${selectedProvider}-${selectedRisk}`,
      title: `${selectedProvider} ${selectedRisk}`,
      subtitle: `${schemes.length} matching scheme${schemes.length === 1 ? '' : 's'}`,
      schemes,
    },
  ];
};

const getLegendLabel = (schemeId: string, fallbackName: string) => {
  const scheme = ANALYSIS_SCHEMES.find((item) => item.id === schemeId);
  if (!scheme) {
    return fallbackName;
  }
  return `${scheme.provider} ${scheme.type}`;
};

const formatMonthKeyLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  return `${month}/${year.slice(-2)}`;
};

type HistoricalSeries = {
  key: string;
  label: string;
  color: string;
  points: { monthKey: string; value: number }[];
  availableStart: string | null;
  availableEnd: string | null;
  pointCount: number;
};

const AnalysisHistoryChart = ({
  width,
  series,
  monthKeys,
  showPercentage,
}: {
  width: number;
  series: HistoricalSeries[];
  monthKeys: string[];
  showPercentage: boolean;
}) => {
  const chartHeight = 260;
  const paddingLeft = 52;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 36;
  const plotWidth = Math.max(1, width - paddingLeft - paddingRight);
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const normalizedSeries = series.map((item) => {
    const baseline = item.points[0]?.value ?? 0;
    const points = item.points.map((point) => ({
      ...point,
      value:
        showPercentage && baseline
          ? ((point.value - baseline) / baseline) * 100
          : point.value,
    }));
    return {
      ...item,
      points,
    };
  });

  const allValues = normalizedSeries.flatMap((item) => item.points.map((point) => point.value));
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const minValue = rawMin === rawMax ? rawMin - 1 : rawMin;
  const maxValue = rawMin === rawMax ? rawMax + 1 : rawMax;
  const valueRange = maxValue - minValue || 1;
  const monthIndex = new Map(monthKeys.map((monthKey, index) => [monthKey, index]));
  const xStep = monthKeys.length > 1 ? plotWidth / (monthKeys.length - 1) : 0;

  const xForMonth = (monthKey: string) => paddingLeft + (monthIndex.get(monthKey) ?? 0) * xStep;
  const yForValue = (value: number) => paddingTop + ((maxValue - value) / valueRange) * plotHeight;

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = maxValue - ratio * valueRange;
    const y = paddingTop + ratio * plotHeight;
    return { value, y };
  });

  const labelInterval = Math.max(1, Math.ceil(monthKeys.length / 6));
  const xLabels = monthKeys.filter((_, index) => index % labelInterval === 0 || index === monthKeys.length - 1);

  return (
    <View>
      <Svg width={width} height={chartHeight}>
        {yTicks.map((tick) => (
          <React.Fragment key={`y-${tick.y}`}>
            <Line
              x1={paddingLeft}
              y1={tick.y}
              x2={width - paddingRight}
              y2={tick.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <SvgText
              x={paddingLeft - 8}
              y={tick.y + 4}
              fontSize="11"
              fill="#64748b"
              textAnchor="end"
            >
              {showPercentage ? `${tick.value.toFixed(1)}%` : `$${tick.value.toFixed(2)}`}
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

        {xLabels.map((monthKey) => (
          <SvgText
            key={`x-${monthKey}`}
            x={xForMonth(monthKey)}
            y={chartHeight - 10}
            fontSize="11"
            fill="#64748b"
            textAnchor="middle"
          >
            {formatMonthKeyLabel(monthKey)}
          </SvgText>
        ))}

        {normalizedSeries.map((item) => {
          const points = item.points
            .map((point) => `${xForMonth(point.monthKey)},${yForValue(point.value)}`)
            .join(' ');

          return (
            <React.Fragment key={item.key}>
              {item.points.length > 1 ? (
                <Polyline
                  points={points}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
              {item.points.length === 1 ? (
                <Circle
                  cx={xForMonth(item.points[0].monthKey)}
                  cy={yForValue(item.points[0].value)}
                  r="4"
                  fill={item.color}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.chartLegendWrap}>
        {series.map((item) => (
          <View key={`legend-${item.key}`} style={styles.chartLegendItem}>
            <View style={[styles.chartLegendDot, { backgroundColor: item.color }]} />
            <Text style={styles.chartLegendText}>
              {item.label}: {item.availableStart ?? 'n/a'} to {item.availableEnd ?? 'n/a'} ({item.pointCount} pts)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const CurrentSchemeAnalysisScreen = () => {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('10Y');
  const [selectedSchemes, setSelectedSchemes] = useState<SchemeData[]>([ANALYSIS_SCHEMES[0]]);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [showPercentage, setShowPercentage] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>(ALL_PROVIDERS);
  const [selectedRisk, setSelectedRisk] = useState<string>(ALL_RISK_LEVELS);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (userSettings && selectedSchemes.length > 0) {
      loadAnalysis();
    }
  }, [userSettings, selectedPeriod, selectedSchemes]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setUserSettings(JSON.parse(savedSettings));
      } else {
        setUserSettings({
          initialFunds: 10000,
          personalContribution: 200,
          companyContribution: 100,
          years: 10,
        });
      }
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  };

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const period = PERIODS.find((item) => item.value === selectedPeriod)!;
      const monthlyContribution = (userSettings.personalContribution || 0) + (userSettings.companyContribution || 0);

      const data = await fetchCurrentSchemeAnalysis(
        selectedSchemes.map((scheme) => scheme.id),
        period.years,
        userSettings.initialFunds || 0,
        monthlyContribution
      );
      setAnalysisResults(data.results);
    } catch (error) {
      console.error('Failed to load analysis', error);
    } finally {
      setLoading(false);
    }
  };

  const visibleSchemes = useMemo(
    () =>
      ANALYSIS_SCHEMES.filter((scheme) => {
        const providerMatches = selectedProvider === ALL_PROVIDERS || scheme.provider === selectedProvider;
        const riskMatches = selectedRisk === ALL_RISK_LEVELS || scheme.type === selectedRisk;
        return providerMatches && riskMatches;
      }),
    [selectedProvider, selectedRisk]
  );

  const groupedSchemes = useMemo(
    () => groupSchemes(visibleSchemes, selectedProvider, selectedRisk),
    [visibleSchemes, selectedProvider, selectedRisk]
  );

  const quickViews = useMemo(
    () => [
      { label: 'Aggressive Across Providers', provider: ALL_PROVIDERS, risk: 'Aggressive' },
      { label: 'Cash Across Providers', provider: ALL_PROVIDERS, risk: 'Cash' },
      ...SCHEME_PROVIDERS.map((provider) => ({
        label: `${provider} Full Range`,
        provider,
        risk: ALL_RISK_LEVELS,
      })),
      { label: 'Show All Schemes', provider: ALL_PROVIDERS, risk: ALL_RISK_LEVELS },
    ],
    []
  );

  const activeFilterSummary = useMemo(() => {
    const providerLabel = selectedProvider === ALL_PROVIDERS ? 'all providers' : selectedProvider;
    const riskLabel = selectedRisk === ALL_RISK_LEVELS ? 'all risk levels' : selectedRisk;
    return `Viewing ${riskLabel} across ${providerLabel}.`;
  }, [selectedProvider, selectedRisk]);

  const toggleScheme = (scheme: SchemeData) => {
    setSelectedSchemes((current) => {
      const isSelected = current.some((item) => item.id === scheme.id);
      if (isSelected) {
        return current.length > 1 ? current.filter((item) => item.id !== scheme.id) : current;
      }
      if (current.length >= MAX_SELECTED_SCHEMES) {
        return current;
      }
      return [...current, scheme];
    });
  };

  const chartState = useMemo(() => {
    if (analysisResults.length === 0) {
      return {
        monthKeys: [] as string[],
        series: [] as HistoricalSeries[],
        rangeSummary: null,
        emptyMessage: null,
      };
    }

    const historyResults = analysisResults
      .map((result: any) => ({
        result,
        history: Array.isArray(result.history) ? result.history : [],
      }))
      .filter((item) => item.history.length > 0);

    if (historyResults.length === 0) {
      return {
        monthKeys: [] as string[],
        series: [] as HistoricalSeries[],
        rangeSummary: null,
        emptyMessage: 'No real historical unit price data is available for the selected schemes yet.',
      };
    }

    const series = historyResults.map(({ result, history }: any) => {
      const scheme = ANALYSIS_SCHEMES.find((item) => item.id === result.scheme.id);
      return {
        key: result.scheme.id,
        label: getLegendLabel(result.scheme.id, result.scheme.name),
        color: scheme?.color || '#0f172a',
        points: history.map((point: any) => ({
          monthKey: String(point.date).slice(0, 7),
          value: Number(point.price),
        })),
        availableStart: result.history_window?.available_start ?? history[0]?.date ?? null,
        availableEnd: result.history_window?.available_end ?? history[history.length - 1]?.date ?? null,
        pointCount: Number(result.history_window?.point_count ?? history.length),
      } as HistoricalSeries;
    });

    const monthKeys = Array.from(
      new Set(series.flatMap((item) => item.points.map((point) => point.monthKey)))
    ).sort();

    if (monthKeys.length === 0) {
      return {
        monthKeys: [],
        series,
        rangeSummary: null,
        emptyMessage: 'No real historical unit price data is available for the selected schemes yet.',
      };
    }

    return {
      monthKeys,
      series,
      rangeSummary: `Timeline shown: ${monthKeys[0]} to ${monthKeys[monthKeys.length - 1]} (${monthKeys.length} monthly ticks)`,
      emptyMessage: null,
    };
  }, [analysisResults]);

  const bestPerformer = useMemo(() => {
    if (analysisResults.length === 0) {
      return null;
    }
    return analysisResults.reduce((best, current) =>
      current.outcome.final_value > best.outcome.final_value ? current : best
    );
  }, [analysisResults]);

  const chartWidth = Math.min(width - 64, 960);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Current Scheme Analysis</Text>
          <Text style={styles.subtitle}>Compare historical performance</Text>
        </View>

        <LinearGradient
          colors={['#3b82f6', '#9333ea']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <Info color="#fff" size={24} style={styles.bannerIcon} />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Welcome to Your Analysis</Text>
              <Text style={styles.bannerText}>
                Compare aggressive or cash funds across providers, or narrow the view to one provider and review its full range.
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Period</Text>
          <View style={styles.periodContainer}>
            {PERIODS.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.value && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period.value)}
              >
                <Text
                  style={[
                    styles.periodText,
                    selectedPeriod === period.value && styles.periodTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Select Schemes</Text>
            <View style={styles.selectionBadge}>
              <Text style={styles.selectionBadgeText}>
                {selectedSchemes.length}/{MAX_SELECTED_SCHEMES} selected
              </Text>
            </View>
          </View>
          <Text style={styles.sectionHint}>
            Filter the catalog first, then choose up to four schemes for the chart and outcome comparison.
          </Text>

          <Text style={styles.filterLabel}>Quick Compare</Text>
          <View style={styles.chipWrap}>
            {quickViews.map((view) => {
              const active = selectedProvider === view.provider && selectedRisk === view.risk;
              return (
                <TouchableOpacity
                  key={view.label}
                  style={[styles.quickViewChip, active && styles.quickViewChipActive]}
                  onPress={() => {
                    setSelectedProvider(view.provider);
                    setSelectedRisk(view.risk);
                  }}
                >
                  <Text style={[styles.quickViewChipText, active && styles.quickViewChipTextActive]}>
                    {view.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.filterLabel}>Providers</Text>
          <View style={styles.chipWrap}>
            {[ALL_PROVIDERS, ...SCHEME_PROVIDERS].map((provider) => {
              const active = selectedProvider === provider;
              return (
                <TouchableOpacity
                  key={provider}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedProvider(provider)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {provider}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.filterLabel}>Risk Levels</Text>
          <View style={styles.chipWrap}>
            {[ALL_RISK_LEVELS, ...SCHEME_RISK_LEVELS].map((riskLevel) => {
              const active = selectedRisk === riskLevel;
              return (
                <TouchableOpacity
                  key={riskLevel}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedRisk(riskLevel)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {riskLevel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.filterSummary}>{activeFilterSummary}</Text>

          <View style={styles.selectedSchemesRow}>
            {selectedSchemes.map((scheme) => (
              <TouchableOpacity
                key={scheme.id}
                style={[styles.selectedSchemeChip, { borderColor: scheme.color }]}
                onPress={() => toggleScheme(scheme)}
              >
                <View style={[styles.selectedSchemeDot, { backgroundColor: scheme.color }]} />
                <Text style={styles.selectedSchemeText}>{scheme.provider} {scheme.type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {groupedSchemes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No schemes match this combination.</Text>
              <Text style={styles.emptyStateText}>Choose a wider provider or risk filter to continue.</Text>
            </View>
          ) : (
            groupedSchemes.map((group) => (
              <View key={group.key} style={styles.schemeGroup}>
                <View style={styles.groupHeader}>
                  <View>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <Text style={styles.groupSubtitle}>{group.subtitle}</Text>
                  </View>
                  <View style={styles.groupCountBadge}>
                    <Text style={styles.groupCountText}>{group.schemes.length}</Text>
                  </View>
                </View>
                <View style={styles.schemeGrid}>
                  {group.schemes.map((scheme) => {
                    const isSelected = selectedSchemes.some((item) => item.id === scheme.id);
                    return (
                      <TouchableOpacity
                        key={scheme.id}
                        style={[
                          styles.schemeCard,
                          isSelected && {
                            borderColor: scheme.color,
                            backgroundColor: `${scheme.color}12`,
                          },
                        ]}
                        onPress={() => toggleScheme(scheme)}
                      >
                        <View style={styles.schemeCardHeader}>
                          <View style={[styles.colorDot, { backgroundColor: scheme.color }]} />
                          <View
                            style={[
                              styles.schemeTag,
                              isSelected && { backgroundColor: scheme.color },
                            ]}
                          >
                            <Text
                              style={[
                                styles.schemeTagText,
                                isSelected && styles.schemeTagTextActive,
                              ]}
                            >
                              {isSelected ? 'Selected' : scheme.type}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.schemeName}>{scheme.name}</Text>
                        <Text style={styles.schemeProvider}>{scheme.provider}</Text>
                        <Text style={styles.schemeActionText}>
                          {isSelected ? 'Tap to remove from comparison' : 'Tap to add to comparison'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loadingState} />
        ) : (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>Unit Price History</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, !showPercentage && styles.toggleButtonActive]}
                  onPress={() => setShowPercentage(false)}
                >
                  <Text style={[styles.toggleText, !showPercentage && styles.toggleTextActive]}>$</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, showPercentage && styles.toggleButtonActive]}
                  onPress={() => setShowPercentage(true)}
                >
                  <Text style={[styles.toggleText, showPercentage && styles.toggleTextActive]}>%</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.chartMeta}>
              DB-backed provider history sampled into monthly real-price points. Each line only appears where real data exists.
            </Text>
            {chartState.rangeSummary ? <Text style={styles.chartMeta}>{chartState.rangeSummary}</Text> : null}
            {chartState.series.length > 0 && chartState.monthKeys.length > 0 ? (
              <AnalysisHistoryChart
                width={chartWidth}
                series={chartState.series}
                monthKeys={chartState.monthKeys}
                showPercentage={showPercentage}
              />
            ) : (
              <Text style={styles.emptyStateText}>{chartState.emptyMessage}</Text>
            )}
          </View>
        )}

        {analysisResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projected Outcomes</Text>
            {analysisResults.map((result: any) => {
              const scheme = ANALYSIS_SCHEMES.find((item) => item.id === result.scheme.id);
              return (
                <View key={result.scheme.id} style={[styles.outcomeCard, { borderLeftColor: scheme?.color }]}>
                  <Text style={styles.outcomeTitle}>{result.scheme.name}</Text>
                  <View style={styles.outcomeRow}>
                    <Text style={styles.outcomeLabel}>Final Value</Text>
                    <Text style={styles.outcomeValue}>${result.outcome.final_value.toLocaleString()}</Text>
                  </View>
                  <View style={styles.outcomeRow}>
                    <Text style={styles.outcomeLabel}>Total Return</Text>
                    <Text
                      style={[
                        styles.outcomeValue,
                        { color: result.outcome.total_return >= 0 ? 'green' : 'red' },
                      ]}
                    >
                      ${result.outcome.total_return.toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {bestPerformer && (
          <LinearGradient colors={['#fffbeb', '#fff7ed']} style={styles.bestPerformerCard}>
            <View style={styles.bestPerformerHeader}>
              <Award color="#d97706" size={24} />
              <Text style={styles.bestPerformerTitle}>Best Performer</Text>
            </View>
            <Text style={styles.bestPerformerName}>{bestPerformer.scheme.name}</Text>
            <Text style={styles.bestPerformerValue}>${bestPerformer.outcome.final_value.toLocaleString()}</Text>
            <Text style={styles.bestPerformerSubtitle}>Highest final value over {selectedPeriod}</Text>
          </LinearGradient>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  banner: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bannerIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerText: {
    color: '#eff6ff',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectionBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  selectionBadgeText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    justifyContent: 'space-between',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  periodText: {
    color: '#64748b',
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#ffffff',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  quickViewChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  quickViewChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  quickViewChipText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  quickViewChipTextActive: {
    color: '#ffffff',
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  filterSummary: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
  },
  selectedSchemesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  selectedSchemeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  selectedSchemeDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  selectedSchemeText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  schemeGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  groupSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  groupCountBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCountText: {
    color: '#0369a1',
    fontWeight: '700',
  },
  schemeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  schemeCard: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    flexGrow: 1,
    flexBasis: 280,
    maxWidth: 360,
    minWidth: 240,
  },
  schemeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  schemeTag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  schemeTagText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  schemeTagTextActive: {
    color: '#ffffff',
  },
  schemeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    lineHeight: 21,
  },
  schemeProvider: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 8,
  },
  schemeActionText: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748b',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingState: {
    marginVertical: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartMeta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    lineHeight: 18,
  },
  chartLegendWrap: {
    marginTop: 8,
    gap: 6,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  chartLegendText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleTextActive: {
    color: '#0f172a',
  },
  outcomeCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  outcomeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  outcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  outcomeLabel: {
    color: '#64748b',
  },
  outcomeValue: {
    fontWeight: '600',
    color: '#0f172a',
  },
  bestPerformerCard: {
    backgroundColor: '#fffbeb',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  bestPerformerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  bestPerformerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
  },
  bestPerformerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  bestPerformerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  bestPerformerSubtitle: {
    fontSize: 14,
    color: '#92400e',
  },
});
