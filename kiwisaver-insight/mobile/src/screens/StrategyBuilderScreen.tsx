import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { ArrowRightLeft, Play, Plus, Trash2, Zap } from 'lucide-react-native';

import { theme } from '../constants/theme';
import {
  fetchStrategyRecommendation,
  getLatestStrategyRecommendation,
  runStrategyBacktest,
} from '../services/api';
import { getOrCreateLocalUserId } from '../services/user';
import {
  SimulationResult,
  StrategyRecommendationCandidate,
  StrategyRecommendationResponse,
  SwitchCondition,
  UserSettings,
} from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONDITION_TYPES = [
  { type: 'price_drop', label: 'Price Drop Below', unit: '%' },
  { type: 'price_rise', label: 'Price Rise Above', unit: '%' },
  { type: 'time_based', label: 'Time-Based Switch', unit: 'years' },
  { type: 'market_volatility', label: 'Market Volatility', unit: '%' },
  { type: 'performance_threshold', label: 'Performance Threshold', unit: 'ratio' },
] as const;

const SCHEME_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'growth', label: 'Growth' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'conservative', label: 'Conservative' },
] as const;

export const StrategyBuilderScreen = () => {
  const [loading, setLoading] = useState(false);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [conditions, setConditions] = useState<SwitchCondition[]>([
    {
      id: '1',
      type: 'price_drop',
      label: 'Price Drop Below',
      from_scheme: 'aggressive',
      to_scheme: 'conservative',
      threshold: 10,
      threshold_unit: '%',
    },
  ]);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [recommendation, setRecommendation] = useState<StrategyRecommendationResponse | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [localUserId, setLocalUserId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    void loadLocalUserId();
  }, []);

  useEffect(() => {
    if (!userSettings?.selectedScheme || !localUserId) {
      return;
    }
    void loadLatestRecommendation(localUserId, userSettings.selectedScheme);
  }, [localUserId, userSettings?.selectedScheme]);

  const requestedYears = Math.max(1, Math.min(userSettings?.years ?? 10, 10));
  const monthlyContribution =
    (userSettings?.personalContribution ?? 0) + (userSettings?.companyContribution ?? 0);

  const chartData = useMemo(() => {
    if (!simulation || simulation.data.length === 0) {
      return null;
    }

    const labelStep = Math.max(1, Math.floor(simulation.data.length / 5));
    return {
      labels: simulation.data.map((point, index) => {
        if (
          index === 0 ||
          index === simulation.data.length - 1 ||
          index % labelStep === 0
        ) {
          return point.date.slice(0, 7);
        }
        return '';
      }),
      datasets: [
        {
          data: simulation.data.map((point) => point.balance),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: simulation.data.map((point) => point.invested),
          color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['Strategy Balance', 'Total Invested'],
    };
  }, [simulation]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setUserSettings(JSON.parse(savedSettings) as UserSettings);
      }
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  };

  const loadLocalUserId = async () => {
    try {
      const userId = await getOrCreateLocalUserId();
      setLocalUserId(userId);
    } catch (error) {
      console.error('Failed to initialize local user profile', error);
      setRecommendationError('Local user profile could not be initialized.');
    }
  };

  const loadLatestRecommendation = async (userId: string, selectedScheme: string) => {
    try {
      const latest = await getLatestStrategyRecommendation(userId, selectedScheme);
      setRecommendation(latest);
      setRecommendationError(null);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setRecommendation(null);
        setRecommendationError(null);
        return;
      }
      console.error('Failed to load latest recommendation', error);
      setRecommendationError('Saved client recommendation could not be loaded.');
    }
  };

  const addCondition = () => {
    const newCondition: SwitchCondition = {
      id: Date.now().toString(),
      type: 'price_drop',
      label: 'Price Drop Below',
      from_scheme: 'balanced',
      to_scheme: 'conservative',
      threshold: 10,
      threshold_unit: '%',
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((condition) => condition.id !== id));
      return;
    }
    Alert.alert('Cannot remove', 'You must keep at least one condition.');
  };

  const updateCondition = (id: string, updates: Partial<SwitchCondition>) => {
    setConditions(conditions.map((condition) => (condition.id === id ? { ...condition, ...updates } : condition)));
  };

  const handleRunBacktest = async () => {
    if (!userSettings) {
      Alert.alert('Settings required', 'Please configure your scheme and contribution settings first.');
      return;
    }

    setLoading(true);
    try {
      const result = await runStrategyBacktest(
        conditions,
        userSettings.initialFunds || 10000,
        monthlyContribution,
        requestedYears,
        userSettings.selectedScheme
      );
      setSimulation(result);
    } catch (error: any) {
      console.error('Backtest failed', error);
      const message = error?.response?.data?.detail || 'Failed to run backtest. Please try again.';
      Alert.alert('Backtest failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecommendation = async () => {
    if (!userSettings) {
      Alert.alert('Settings required', 'Please configure your scheme and contribution settings first.');
      return;
    }
    if (!localUserId) {
      Alert.alert('User profile loading', 'Please wait until your local user profile is ready.');
      return;
    }

    setRecommendationLoading(true);
    try {
      const response = await fetchStrategyRecommendation({
        selected_scheme: userSettings.selectedScheme,
        initial_funds: userSettings.initialFunds || 10000,
        monthly_contribution: monthlyContribution,
        years: requestedYears,
        user_id: localUserId,
        persist: true,
      });
      setRecommendation(response);
      setRecommendationError(null);
    } catch (error: any) {
      console.error('Recommendation generation failed', error);
      const message =
        error?.response?.data?.detail || 'The client-ready strategy recommendation could not be generated.';
      setRecommendationError(message);
      Alert.alert('Recommendation failed', message);
    } finally {
      setRecommendationLoading(false);
    }
  };

  const totalReturnValue = simulation ? simulation.final_balance - simulation.total_invested : 0;

  const renderRule = (rule: StrategyRecommendationCandidate['switch_rules'][number]) => (
    <View key={rule.id} style={styles.ruleRow}>
      <Text style={styles.ruleTitle}>{rule.label}</Text>
      <Text style={styles.ruleText}>
        {rule.from_scheme} to {rule.to_scheme} when {rule.type.replace(/_/g, ' ')} hits {rule.threshold}
        {rule.threshold_unit}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Strategy Builder</Text>
          <Text style={styles.subtitle}>Rule-based switching driven by real provider history</Text>
        </View>

        <LinearGradient
          colors={['#0f766e', '#2563eb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <Zap color="#fff" size={24} />
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Real Backtest Path</Text>
            <Text style={styles.bannerText}>
              The strategy now runs on stored monthly unit prices from your selected provider. Future checkpoints reuse
              the return model derived from that realized path.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.contextCard}>
          <Text style={styles.contextLabel}>Selected scheme</Text>
          <Text style={styles.contextValue}>{userSettings?.selectedScheme ?? 'Not configured yet'}</Text>
          <Text style={styles.contextHelp}>
            Requested backtest window: {requestedYears} year{requestedYears === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Client Strategy Recommendation</Text>
          </View>
          <Text style={styles.sectionIntro}>
            Generate a customer-facing switch strategy summary from the latest real backtest data for the selected
            provider.
          </Text>

          <TouchableOpacity onPress={handleGenerateRecommendation} disabled={recommendationLoading}>
            <LinearGradient
              colors={['#0f766e', '#14b8a6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.recommendButton}
            >
              {recommendationLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Zap color="#fff" size={20} />
                  <Text style={styles.runButtonText}>Generate Client Recommendation</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {recommendation ? (
            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationLabel}>Recommended Strategy</Text>
              <Text style={styles.recommendationTitle}>{recommendation.recommended_strategy.label}</Text>
              <Text style={styles.recommendationAudience}>{recommendation.recommended_strategy.audience}</Text>
              <Text style={styles.recommendationSummary}>{recommendation.recommended_strategy.summary}</Text>

              <View style={styles.recommendationMetrics}>
                <View style={styles.recommendationMetric}>
                  <Text style={styles.statLabel}>Confidence</Text>
                  <Text style={styles.statValue}>{recommendation.recommended_strategy.confidence}</Text>
                </View>
                <View style={styles.recommendationMetric}>
                  <Text style={styles.statLabel}>Ann. Return</Text>
                  <Text style={styles.statValue}>
                    {(recommendation.recommended_strategy.backtest.annualized_return * 100).toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.recommendationMetric}>
                  <Text style={styles.statLabel}>Max Drawdown</Text>
                  <Text style={styles.statValue}>
                    {recommendation.recommended_strategy.backtest.max_drawdown_pct.toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.recommendationMetric}>
                  <Text style={styles.statLabel}>Switches</Text>
                  <Text style={styles.statValue}>
                    {recommendation.recommended_strategy.backtest.switch_count}
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Why This Strategy</Text>
                {recommendation.recommended_strategy.why_recommended.map((reason, index) => (
                  <Text key={`reason-${index}`} style={styles.detailText}>
                    {index + 1}. {reason}
                  </Text>
                ))}
                <Text style={styles.detailText}>
                  Baseline delta:{' '}
                  {recommendation.recommended_strategy.comparison_to_baseline.final_balance_delta >= 0 ? '+' : ''}
                  ${recommendation.recommended_strategy.comparison_to_baseline.final_balance_delta.toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Switch Rules</Text>
                {recommendation.recommended_strategy.switch_rules.length > 0 ? (
                  recommendation.recommended_strategy.switch_rules.map(renderRule)
                ) : (
                  <Text style={styles.detailText}>No switching. Stay in the selected scheme throughout the window.</Text>
                )}
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Top Candidate Strategies</Text>
                {recommendation.top_strategies.map((candidate) => (
                  <View key={candidate.id} style={styles.candidateRow}>
                    <View style={styles.candidateTextGroup}>
                      <Text style={styles.ruleTitle}>{candidate.label}</Text>
                      <Text style={styles.detailText}>
                        Score {candidate.score.toFixed(1)} | Return {(candidate.backtest.annualized_return * 100).toFixed(2)}%
                      </Text>
                    </View>
                    <Text style={styles.candidateValue}>
                      ${candidate.backtest.final_balance.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={styles.detailText}>Review cycle: {recommendation.review_cycle}</Text>
              <Text style={styles.disclaimerText}>{recommendation.disclaimer}</Text>
            </View>
          ) : null}

          {recommendationError ? <Text style={styles.recommendationError}>{recommendationError}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Switch Conditions</Text>
            <TouchableOpacity onPress={addCondition} style={styles.addButton}>
              <Plus color="#fff" size={20} />
            </TouchableOpacity>
          </View>

          {conditions.map((condition, index) => (
            <View key={condition.id} style={styles.conditionCard}>
              <View style={styles.conditionHeader}>
                <Text style={styles.conditionIndex}>Rule #{index + 1}</Text>
                {conditions.length > 1 && (
                  <TouchableOpacity onPress={() => removeCondition(condition.id)}>
                    <Trash2 color="#ef4444" size={18} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Condition Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                  {CONDITION_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.type}
                      style={[styles.typeButton, condition.type === type.type && styles.typeButtonActive]}
                      onPress={() =>
                        updateCondition(condition.id, {
                          type: type.type,
                          label: type.label,
                          threshold_unit: type.unit,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          condition.type === type.type && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth, styles.rightGap]}>
                  <Text style={styles.label}>When in</Text>
                  <View style={styles.pickerContainer}>
                    {SCHEME_TYPES.map((scheme) => (
                      <TouchableOpacity
                        key={scheme.value}
                        style={[
                          styles.pickerButton,
                          condition.from_scheme === scheme.value && styles.pickerButtonActive,
                        ]}
                        onPress={() => updateCondition(condition.id, { from_scheme: scheme.value })}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            condition.from_scheme === scheme.value && styles.pickerTextActive,
                          ]}
                        >
                          {scheme.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth, styles.leftGap]}>
                  <Text style={styles.label}>Switch to</Text>
                  <View style={styles.pickerContainer}>
                    {SCHEME_TYPES.map((scheme) => (
                      <TouchableOpacity
                        key={scheme.value}
                        style={[
                          styles.pickerButton,
                          condition.to_scheme === scheme.value && styles.pickerButtonActive,
                        ]}
                        onPress={() => updateCondition(condition.id, { to_scheme: scheme.value })}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            condition.to_scheme === scheme.value && styles.pickerTextActive,
                          ]}
                        >
                          {scheme.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Threshold ({condition.threshold_unit})</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(condition.threshold)}
                  onChangeText={(text) => updateCondition(condition.id, { threshold: parseFloat(text) || 0 })}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity onPress={handleRunBacktest} disabled={loading}>
            <LinearGradient
              colors={['#3b82f6', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.runButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Play color="#fff" size={20} />
                  <Text style={styles.runButtonText}>Run Backtest ({requestedYears}Y Real Data)</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {simulation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Backtest Results</Text>

            {chartData && (
              <View style={styles.chartContainer}>
                <LineChart
                  data={chartData}
                  width={SCREEN_WIDTH - 32}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: { r: '0' },
                  }}
                  bezier
                  style={styles.chart}
                  formatYLabel={(value) => `$${Math.round(Number(value) / 1000)}k`}
                />
              </View>
            )}

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Final Balance</Text>
                <Text style={styles.statValue}>${simulation.final_balance.toLocaleString()}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Return</Text>
                <Text style={[styles.statValue, totalReturnValue >= 0 ? styles.positiveValue : styles.negativeValue]}>
                  ${totalReturnValue.toLocaleString()}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Model Return</Text>
                <Text style={styles.statValue}>
                  {((simulation.model?.annualized_return ?? 0) * 100).toFixed(2)}%
                </Text>
              </View>
            </View>

            {simulation.actual_window && (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Real History Window</Text>
                <Text style={styles.detailText}>Provider: {simulation.actual_window.provider}</Text>
                <Text style={styles.detailText}>
                  Range: {simulation.actual_window.start_date} to {simulation.actual_window.end_date}
                </Text>
                <Text style={styles.detailText}>
                  Observations: {simulation.actual_window.point_count} points / {simulation.actual_window.source_months}{' '}
                  monthly returns
                </Text>
              </View>
            )}

            {simulation.future_projections && simulation.future_projections.length > 0 && (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Model-Reused Future Checkpoints</Text>
                {simulation.future_projections.map((projection) => (
                  <View key={projection.years_ahead} style={styles.projectionRow}>
                    <Text style={styles.detailText}>+{projection.years_ahead} years</Text>
                    <View style={styles.projectionValues}>
                      <Text style={styles.projectionValue}>${projection.projected_value.toLocaleString()}</Text>
                      <Text style={styles.projectionGain}>Gain ${projection.projected_gain.toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {simulation.switches.length > 0 && (
              <View style={styles.switchesCard}>
                <View style={styles.switchesHeader}>
                  <ArrowRightLeft color="#b45309" size={20} />
                  <Text style={styles.switchesTitle}>Triggered Switches ({simulation.switches.length})</Text>
                </View>
                {simulation.switches.map((switchEvent, index) => (
                  <Text key={`${switchEvent.month}-${index}`} style={styles.switchText}>
                    Month {switchEvent.month}: {switchEvent.from} to {switchEvent.to} ({switchEvent.reason})
                  </Text>
                ))}
              </View>
            )}
          </View>
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
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bannerContent: {
    marginLeft: 12,
    flex: 1,
  },
  bannerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  bannerText: {
    color: '#dbeafe',
    fontSize: 14,
    lineHeight: 20,
  },
  contextCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contextLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  contextValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  contextHelp: {
    fontSize: 13,
    color: '#475569',
    marginTop: 6,
  },
  sectionIntro: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    padding: 8,
    borderRadius: 8,
  },
  conditionCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  conditionIndex: {
    fontWeight: '600',
    color: '#64748b',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  typeScroll: {
    flexGrow: 0,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  typeButtonText: {
    fontSize: 12,
    color: '#475569',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  row: {
    flexDirection: 'row',
  },
  halfWidth: {
    flex: 1,
  },
  rightGap: {
    marginRight: 8,
  },
  leftGap: {
    marginLeft: 8,
  },
  pickerContainer: {
    gap: 4,
  },
  pickerButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  pickerButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  pickerText: {
    fontSize: 12,
    color: '#475569',
  },
  pickerTextActive: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  runButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  recommendButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  recommendationCard: {
    marginTop: 16,
    backgroundColor: '#f8fffe',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  recommendationLabel: {
    fontSize: 12,
    color: '#0f766e',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  recommendationTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  recommendationAudience: {
    fontSize: 14,
    color: '#0f766e',
    marginTop: 6,
    fontWeight: '600',
  },
  recommendationSummary: {
    fontSize: 14,
    color: '#334155',
    marginTop: 8,
    lineHeight: 20,
  },
  recommendationMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  recommendationMetric: {
    minWidth: 120,
    flexGrow: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
  },
  runButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  positiveValue: {
    color: '#15803d',
  },
  negativeValue: {
    color: '#b91c1c',
  },
  detailCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  projectionValues: {
    alignItems: 'flex-end',
  },
  projectionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  projectionGain: {
    fontSize: 12,
    color: '#15803d',
  },
  ruleRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  ruleText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  candidateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  candidateTextGroup: {
    flex: 1,
    paddingRight: 8,
  },
  candidateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 12,
    lineHeight: 18,
  },
  recommendationError: {
    color: theme.colors.danger,
    marginTop: 10,
  },
  switchesCard: {
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  switchesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  switchesTitle: {
    fontWeight: '600',
    color: '#92400e',
  },
  switchText: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 4,
  },
});
