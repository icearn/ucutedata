import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, TrendingUp } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';

import { Card } from '../components/Card';
import { ScreenContainer } from '../components/ScreenContainer';
import { theme } from '../constants/theme';
import { fetchScenarioComparison } from '../services/api';
import { ScenarioComparisonResponse, ScenarioResult, ScenarioType, UserSettings } from '../types';

const CHART_WIDTH = Dimensions.get('window').width - 64;

export const ScenarioComparisonScreen = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [scenarioData, setScenarioData] = useState<ScenarioComparisonResponse | null>(null);
  const [selectedScenarios, setSelectedScenarios] = useState<ScenarioType[]>(['same', 'best']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (!savedSettings) {
        setError('User settings are not configured yet.');
        return;
      }

      const parsedSettings = JSON.parse(savedSettings) as UserSettings;
      const monthlyContribution =
        (parsedSettings.personalContribution || 0) + (parsedSettings.companyContribution || 0);
      const response = await fetchScenarioComparison(
        parsedSettings.selectedScheme,
        parsedSettings.initialFunds || 10000,
        monthlyContribution,
        parsedSettings.years || 10
      );

      setSettings(parsedSettings);
      setScenarioData(response);

      const availableIds = response.scenarios.map((scenario) => scenario.id);
      setSelectedScenarios((current) => {
        const kept = current.filter((scenarioId) => availableIds.includes(scenarioId));
        if (kept.length > 0) {
          return kept;
        }
        return availableIds.slice(0, Math.min(2, availableIds.length)) as ScenarioType[];
      });
    } catch (loadError) {
      console.error(loadError);
      setError('Failed to load scenario comparison data.');
    } finally {
      setLoading(false);
    }
  };

  const scenarios = scenarioData?.scenarios ?? [];

  const toggleScenario = (scenarioId: ScenarioType) => {
    if (selectedScenarios.includes(scenarioId)) {
      if (selectedScenarios.length > 1) {
        setSelectedScenarios(selectedScenarios.filter((id) => id !== scenarioId));
      }
      return;
    }
    setSelectedScenarios([...selectedScenarios, scenarioId]);
  };

  const selectedScenarioResults = useMemo(
    () => scenarios.filter((scenario) => selectedScenarios.includes(scenario.id)),
    [scenarios, selectedScenarios]
  );

  const chartData = useMemo(() => {
    if (!settings || selectedScenarioResults.length === 0) {
      return null;
    }

    const interval = Math.max(1, Math.round(settings.years / 5));
    const labels = selectedScenarioResults[0].projection.map((point) => {
      if (point.year === 0 || point.year === settings.years || point.year % interval === 0) {
        return point.year.toString();
      }
      return '';
    });

    return {
      labels,
      datasets: selectedScenarioResults.map((scenario) => ({
        data: scenario.projection.map((point) => point.balance),
        color: () => scenario.color,
        strokeWidth: 2,
      })),
      legend: selectedScenarioResults.map((scenario) => scenario.label),
    };
  }, [selectedScenarioResults, settings]);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading real scenario data...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!settings || !scenarioData || error) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'No scenario data available.'}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={theme.typography.h2}>Investment Scenarios</Text>
          <Text style={theme.typography.caption}>
            Projections are calibrated from up to 10 years of real provider history.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Selected baseline</Text>
          <Text style={styles.infoValue}>{scenarioData.selected_scheme?.name ?? settings.selectedScheme}</Text>
          <Text style={styles.infoHelp}>
            Backtest calibration used {scenarioData.scenario_backtest_window?.max_actual_years_used ?? 0} years of
            live history.
          </Text>
        </View>

        <View style={styles.scenariosContainer}>
          {scenarios.map((scenario) => (
            <TouchableOpacity
              key={scenario.id}
              style={[
                styles.scenarioButton,
                selectedScenarios.includes(scenario.id) && styles.scenarioButtonSelected,
              ]}
              onPress={() => toggleScenario(scenario.id)}
            >
              <View style={styles.scenarioHeader}>
                <View style={[styles.colorDot, { backgroundColor: scenario.color }]} />
                <Text style={styles.scenarioLabel}>{scenario.label}</Text>
                {selectedScenarios.includes(scenario.id) && (
                  <Check size={16} color={theme.colors.primary} />
                )}
              </View>
              <Text style={styles.scenarioDesc}>{scenario.description}</Text>
              <Text style={styles.scenarioMeta}>Source scheme: {scenario.source_scheme.name}</Text>
              <Text style={styles.scenarioMeta}>
                Model return {((scenario.model.annualized_return ?? 0) * 100).toFixed(2)}% / volatility{' '}
                {((scenario.model.annualized_volatility ?? 0) * 100).toFixed(2)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card>
          <View style={styles.chartHeader}>
            <TrendingUp size={20} color={theme.colors.primary} />
            <Text style={styles.chartTitle}>Projected Growth</Text>
          </View>
          {chartData && (
            <LineChart
              data={chartData}
              width={CHART_WIDTH}
              height={220}
              yAxisLabel="$"
              chartConfig={{
                backgroundColor: theme.colors.card,
                backgroundGradientFrom: theme.colors.card,
                backgroundGradientTo: theme.colors.card,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: '0' },
              }}
              bezier
              style={styles.chart}
              formatYLabel={(value) => `${Math.round(Number(value) / 1000)}k`}
            />
          )}
        </Card>

        <View style={styles.summaryContainer}>
          <Text style={theme.typography.h3}>Final Values ({settings.years} years)</Text>
          {selectedScenarioResults.map((scenario) => (
            <View key={scenario.id} style={styles.summaryRow}>
              <View style={styles.summaryLabelRow}>
                <View style={[styles.colorDot, { backgroundColor: scenario.color }]} />
                <View>
                  <Text style={styles.summaryLabel}>{scenario.label}</Text>
                  <Text style={styles.summarySubLabel}>{scenario.source_scheme.provider}</Text>
                </View>
              </View>
              <View style={styles.summaryValues}>
                <Text style={styles.summaryValue}>${scenario.final_value.toLocaleString()}</Text>
                <Text style={styles.summaryReturn}>Return ${scenario.total_return.toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.backtestContainer}>
          <Text style={theme.typography.h3}>Calibration Windows</Text>
          {selectedScenarioResults.map((scenario: ScenarioResult) => (
            <View key={`${scenario.id}-backtest`} style={styles.backtestRow}>
              <View>
                <Text style={styles.backtestLabel}>{scenario.label}</Text>
                <Text style={styles.backtestSubLabel}>
                  {scenario.backtest.start_date} to {scenario.backtest.end_date}
                </Text>
              </View>
              <Text style={styles.backtestValue}>{scenario.backtest.source_months} months</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.l,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  loadingText: {
    ...theme.typography.caption,
  },
  errorText: {
    ...theme.typography.body,
    color: '#b91c1c',
  },
  infoCard: {
    marginBottom: theme.spacing.l,
    padding: theme.spacing.m,
    backgroundColor: '#eff6ff',
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoLabel: {
    ...theme.typography.caption,
    color: '#1d4ed8',
  },
  infoValue: {
    ...theme.typography.h3,
    marginTop: 4,
  },
  infoHelp: {
    ...theme.typography.caption,
    marginTop: 6,
  },
  scenariosContainer: {
    marginBottom: theme.spacing.l,
    gap: theme.spacing.s,
  },
  scenarioButton: {
    padding: theme.spacing.m,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scenarioButtonSelected: {
    backgroundColor: '#eff6ff',
    borderColor: theme.colors.primary,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  scenarioLabel: {
    ...theme.typography.body,
    fontWeight: '500',
    flex: 1,
  },
  scenarioDesc: {
    ...theme.typography.caption,
    marginBottom: 4,
  },
  scenarioMeta: {
    ...theme.typography.caption,
    color: '#1d4ed8',
    marginTop: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
    gap: theme.spacing.s,
  },
  chartTitle: {
    ...theme.typography.h3,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  summaryContainer: {
    marginTop: theme.spacing.l,
    padding: theme.spacing.m,
    backgroundColor: '#f0f9ff',
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.s,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    ...theme.typography.body,
  },
  summarySubLabel: {
    ...theme.typography.caption,
  },
  summaryValues: {
    alignItems: 'flex-end',
  },
  summaryValue: {
    ...theme.typography.body,
    fontWeight: 'bold',
  },
  summaryReturn: {
    ...theme.typography.caption,
    color: theme.colors.success,
  },
  backtestContainer: {
    marginTop: theme.spacing.l,
    padding: theme.spacing.m,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backtestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.s,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  backtestLabel: {
    ...theme.typography.body,
    fontWeight: '500',
  },
  backtestSubLabel: {
    ...theme.typography.caption,
  },
  backtestValue: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
