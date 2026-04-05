import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowUpRight, Calendar, DollarSign, Target, TrendingUp } from 'lucide-react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';

import { Card } from '../components/Card';
import { ScreenContainer } from '../components/ScreenContainer';
import { theme } from '../constants/theme';
import { fetchScenarioComparison } from '../services/api';
import { ScenarioComparisonResponse, ScenarioResult, UserSettings } from '../types';

const CHART_WIDTH = Dimensions.get('window').width - 64;

export const ResultsSummaryScreen = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [scenarioData, setScenarioData] = useState<ScenarioComparisonResponse | null>(null);
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
    } catch (loadError) {
      console.error(loadError);
      setError('Failed to load summary data.');
    } finally {
      setLoading(false);
    }
  };

  const summaryData = useMemo(() => {
    if (!settings || !scenarioData || scenarioData.scenarios.length === 0) {
      return null;
    }

    const monthlyContribution = settings.personalContribution + settings.companyContribution;
    const totalContributions = settings.initialFunds + monthlyContribution * settings.years * 12;
    const bestScenario =
      scenarioData.scenarios.find((scenario) => scenario.id === scenarioData.best_scenario_id) ??
      scenarioData.scenarios.reduce((best, current) =>
        current.final_value > best.final_value ? current : best
      );

    return {
      monthlyContribution,
      totalContributions,
      scenarioResults: scenarioData.scenarios,
      bestScenario,
      futureProjections: scenarioData.future_projections,
    };
  }, [scenarioData, settings]);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading summary from real history...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!settings || !summaryData || error) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'No summary data available.'}</Text>
        </View>
      </ScreenContainer>
    );
  }

  const { monthlyContribution, totalContributions, scenarioResults, bestScenario, futureProjections } = summaryData;
  const realizedReturn = bestScenario.final_value - totalContributions;

  const pieData = [
    {
      name: 'Initial',
      population: settings.initialFunds,
      color: '#8b5cf6',
      legendFontColor: '#475569',
      legendFontSize: 12,
    },
    {
      name: 'Contribs',
      population: totalContributions - settings.initialFunds,
      color: '#3b82f6',
      legendFontColor: '#475569',
      legendFontSize: 12,
    },
    {
      name: 'Returns',
      population: Math.max(realizedReturn, 0),
      color: '#10b981',
      legendFontColor: '#475569',
      legendFontSize: 12,
    },
  ];

  const barData = {
    labels: scenarioResults.map((scenario) => scenario.label.split(' ')[0]),
    datasets: [
      {
        data: scenarioResults.map((scenario) => scenario.final_value / 1000),
      },
    ],
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={theme.typography.h2}>Results Summary</Text>
          <Text style={theme.typography.caption}>Real history in, calibrated model projections out.</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, styles.metricBlue]}>
            <View style={styles.metricHeader}>
              <DollarSign size={16} color="white" />
              <Text style={styles.metricLabel}>Initial Funds</Text>
            </View>
            <Text style={styles.metricValue}>${settings.initialFunds.toLocaleString()}</Text>
          </View>
          <View style={[styles.metricCard, styles.metricPurple]}>
            <View style={styles.metricHeader}>
              <Target size={16} color="white" />
              <Text style={styles.metricLabel}>Monthly</Text>
            </View>
            <Text style={styles.metricValue}>${monthlyContribution.toLocaleString()}</Text>
          </View>
          <View style={[styles.metricCard, styles.metricGreen]}>
            <View style={styles.metricHeader}>
              <Calendar size={16} color="white" />
              <Text style={styles.metricLabel}>Horizon</Text>
            </View>
            <Text style={styles.metricValue}>{settings.years} years</Text>
          </View>
          <View style={[styles.metricCard, styles.metricAmber]}>
            <View style={styles.metricHeader}>
              <TrendingUp size={16} color="white" />
              <Text style={styles.metricLabel}>Total Input</Text>
            </View>
            <Text style={styles.metricValue}>${Math.round(totalContributions / 1000)}k</Text>
          </View>
        </View>

        <Card>
          <Text style={theme.typography.h3}>Scenario Comparison</Text>
          {scenarioResults.map((scenario) => (
            <View key={scenario.id} style={styles.scenarioRow}>
              <View style={styles.scenarioLabelRow}>
                <View style={[styles.colorDot, { backgroundColor: scenario.color }]} />
                <View style={styles.scenarioTextGroup}>
                  <Text style={styles.scenarioName}>{scenario.label}</Text>
                  <Text style={styles.scenarioSource}>{scenario.source_scheme.name}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.scenarioValue}>${scenario.final_value.toLocaleString()}</Text>
                <Text style={styles.scenarioReturn}>${scenario.total_return.toLocaleString()} return</Text>
              </View>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={theme.typography.h3}>Value Comparison (k$)</Text>
          <BarChart
            data={barData}
            width={CHART_WIDTH}
            height={220}
            yAxisLabel="$"
            yAxisSuffix="k"
            chartConfig={{
              backgroundColor: theme.colors.card,
              backgroundGradientFrom: theme.colors.card,
              backgroundGradientTo: theme.colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
            }}
            style={styles.chart}
          />
        </Card>

        <Card>
          <Text style={theme.typography.h3}>Best Scenario Breakdown</Text>
          <Text style={styles.bestScenarioText}>
            {bestScenario.label} is currently led by {bestScenario.source_scheme.name}, calibrated on{' '}
            {bestScenario.backtest.source_months} months of real unit-price history.
          </Text>
          <PieChart
            data={pieData}
            width={CHART_WIDTH}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute={false}
          />
        </Card>

        <View style={styles.projectionsContainer}>
          <View style={styles.projectionsHeader}>
            <ArrowUpRight size={20} color={theme.colors.primary} />
            <Text style={theme.typography.h3}>Reusable Model Projections</Text>
          </View>
          <Text style={styles.projectionsDesc}>
            These checkpoints reuse the best scenario model inferred from the latest 10-year backtest window.
          </Text>

          {futureProjections.map((projection) => (
            <View key={projection.years_ahead} style={styles.projectionRow}>
              <View>
                <Text style={styles.projectionLabel}>After {projection.total_years} years total</Text>
                <Text style={styles.projectionSubLabel}>+{projection.years_ahead} years from current plan</Text>
              </View>
              <View style={styles.projectionValues}>
                <Text style={styles.projectionValue}>${projection.projected_value.toLocaleString()}</Text>
                <Text style={styles.projectionGain}>Gain ${projection.projected_gain.toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.modelCard}>
          <Text style={theme.typography.h3}>Model Metadata</Text>
          <Text style={styles.modelText}>
            Annualized return: {((bestScenario.model.annualized_return ?? 0) * 100).toFixed(2)}%
          </Text>
          <Text style={styles.modelText}>
            Annualized volatility: {((bestScenario.model.annualized_volatility ?? 0) * 100).toFixed(2)}%
          </Text>
          <Text style={styles.modelText}>
            Source range: {bestScenario.model.source_start} to {bestScenario.model.source_end}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xl,
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
  header: {
    marginBottom: theme.spacing.l,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.l,
  },
  metricCard: {
    width: '48%',
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
  },
  metricBlue: {
    backgroundColor: '#3b82f6',
  },
  metricPurple: {
    backgroundColor: '#8b5cf6',
  },
  metricGreen: {
    backgroundColor: '#10b981',
  },
  metricAmber: {
    backgroundColor: '#f59e0b',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  metricLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
  },
  metricValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scenarioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  scenarioLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  scenarioTextGroup: {
    flex: 1,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  scenarioName: {
    ...theme.typography.body,
    fontSize: 14,
  },
  scenarioSource: {
    ...theme.typography.caption,
  },
  scenarioValue: {
    ...theme.typography.body,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  scenarioReturn: {
    ...theme.typography.caption,
    color: theme.colors.success,
    textAlign: 'right',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  bestScenarioText: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.m,
  },
  projectionsContainer: {
    marginTop: theme.spacing.l,
    padding: theme.spacing.m,
    backgroundColor: '#f0f9ff',
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  projectionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
    gap: theme.spacing.s,
  },
  projectionsDesc: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.m,
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.s,
    marginBottom: theme.spacing.s,
  },
  projectionLabel: {
    ...theme.typography.body,
    fontSize: 14,
  },
  projectionSubLabel: {
    ...theme.typography.caption,
    fontSize: 12,
  },
  projectionValues: {
    alignItems: 'flex-end',
  },
  projectionValue: {
    ...theme.typography.h3,
    fontSize: 16,
  },
  projectionGain: {
    ...theme.typography.caption,
    color: theme.colors.success,
  },
  modelCard: {
    marginTop: theme.spacing.l,
    padding: theme.spacing.m,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modelText: {
    ...theme.typography.body,
    marginTop: theme.spacing.xs,
  },
});
