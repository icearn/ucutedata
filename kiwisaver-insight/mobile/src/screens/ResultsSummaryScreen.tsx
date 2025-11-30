import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/Card';
import { theme } from '../constants/theme';
import { BarChart, PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSettings } from '../types';
import { DollarSign, Calendar, TrendingUp, Target, ArrowUpRight } from 'lucide-react-native';

type ScenarioType = 'same' | 'worst' | 'normal' | 'best';

type ScenarioConfig = {
  id: ScenarioType;
  label: string;
  color: string;
  returnRate: number;
};

const SCENARIO_CONFIGS: ScenarioConfig[] = [
  { id: 'same', label: 'Stay with Same Scheme', color: '#3b82f6', returnRate: 0.065 },
  { id: 'worst', label: 'Worst Choice Scheme', color: '#ef4444', returnRate: 0.03 },
  { id: 'normal', label: 'Normal Switch Scheme', color: '#f59e0b', returnRate: 0.055 },
  { id: 'best', label: 'Best Luck Jump Scheme', color: '#10b981', returnRate: 0.085 },
];

export const ResultsSummaryScreen = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const summaryData = useMemo(() => {
    if (!settings) return null;

    const monthlyContribution = settings.personalContribution + settings.companyContribution;
    const totalContributions = settings.initialFunds + (monthlyContribution * settings.years * 12);

    const calculateScenarioValue = (returnRate: number) => {
      let balance = settings.initialFunds;
      const monthlyRate = returnRate / 12;
      const months = settings.years * 12;
      for (let month = 1; month <= months; month++) {
        balance = balance * (1 + monthlyRate) + monthlyContribution;
      }
      return Math.round(balance);
    };

    const scenarioResults = SCENARIO_CONFIGS.map(scenario => ({
      ...scenario,
      finalValue: calculateScenarioValue(scenario.returnRate),
    }));

    const bestScenario = scenarioResults.reduce((best, current) => 
      current.finalValue > best.finalValue ? current : best
    , scenarioResults[0]);

    return {
      monthlyContribution,
      totalContributions,
      scenarioResults,
      bestScenario,
    };
  }, [settings]);

  if (loading || !settings || !summaryData) {
    return (
      <ScreenContainer>
        <Text>Loading...</Text>
      </ScreenContainer>
    );
  }

  const { monthlyContribution, totalContributions, scenarioResults, bestScenario } = summaryData;

  const pieData = [
    { name: 'Initial', population: settings.initialFunds, color: '#8b5cf6', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Contribs', population: totalContributions - settings.initialFunds, color: '#3b82f6', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Returns', population: bestScenario.finalValue - totalContributions, color: '#10b981', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  ];

  const barData = {
    labels: scenarioResults.map(s => s.label.split(' ')[0]), // Shorten labels
    datasets: [{
      data: scenarioResults.map(s => s.finalValue / 1000) // In thousands
    }]
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={theme.typography.h2}>Results Summary</Text>
          <Text style={theme.typography.caption}>Your KiwiSaver investment analysis</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: '#3B82F6' }]}>
            <View style={styles.metricHeader}>
              <DollarSign size={16} color="white" />
              <Text style={styles.metricLabel}>Initial Funds</Text>
            </View>
            <Text style={styles.metricValue}>${settings.initialFunds.toLocaleString()}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#8B5CF6' }]}>
            <View style={styles.metricHeader}>
              <Target size={16} color="white" />
              <Text style={styles.metricLabel}>Monthly</Text>
            </View>
            <Text style={styles.metricValue}>${monthlyContribution.toLocaleString()}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#10B981' }]}>
            <View style={styles.metricHeader}>
              <Calendar size={16} color="white" />
              <Text style={styles.metricLabel}>Time Period</Text>
            </View>
            <Text style={styles.metricValue}>{settings.years} years</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#F59E0B' }]}>
            <View style={styles.metricHeader}>
              <TrendingUp size={16} color="white" />
              <Text style={styles.metricLabel}>Total Input</Text>
            </View>
            <Text style={styles.metricValue}>${(totalContributions / 1000).toFixed(0)}k</Text>
          </View>
        </View>

        <Card>
          <Text style={theme.typography.h3}>Scenario Comparison</Text>
          {scenarioResults.map(scenario => (
            <View key={scenario.id} style={styles.scenarioRow}>
              <View style={styles.scenarioLabelRow}>
                <View style={[styles.colorDot, { backgroundColor: scenario.color }]} />
                <Text style={styles.scenarioName}>{scenario.label}</Text>
              </View>
              <View>
                <Text style={styles.scenarioValue}>${scenario.finalValue.toLocaleString()}</Text>
                <Text style={styles.scenarioReturn}>+${(scenario.finalValue - totalContributions).toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={theme.typography.h3}>Value Comparison (k$)</Text>
          <BarChart
            data={barData}
            width={Dimensions.get("window").width - 64}
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
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </Card>

        <Card>
          <Text style={theme.typography.h3}>Best Scenario Breakdown</Text>
          <PieChart
            data={pieData}
            width={Dimensions.get("window").width - 64}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            absolute={false}
          />
        </Card>

        <View style={styles.projectionsContainer}>
          <View style={styles.projectionsHeader}>
            <ArrowUpRight size={20} color={theme.colors.primary} />
            <Text style={theme.typography.h3}>Future Projections</Text>
          </View>
          <Text style={styles.projectionsDesc}>If you continue with the best performing strategy:</Text>
          
          {[5, 10, 15].map(years => {
             const value = calculateScenarioValue(bestScenario.returnRate); // Current end value
             const projectedValue = value * Math.pow(1 + bestScenario.returnRate, years);
             return (
               <View key={years} style={styles.projectionRow}>
                 <View>
                   <Text style={styles.projectionLabel}>After {settings.years + years} years</Text>
                   <Text style={styles.projectionSubLabel}>(+{years} years from now)</Text>
                 </View>
                 <View style={{ alignItems: 'flex-end' }}>
                   <Text style={styles.projectionValue}>${Math.round(projectedValue).toLocaleString()}</Text>
                   <Text style={styles.projectionGain}>+${Math.round(projectedValue - value).toLocaleString()}</Text>
                 </View>
               </View>
             );
           })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  // Helper for projection calculation inside render (duplicated logic, but safe)
  function calculateScenarioValue(returnRate: number) {
      let balance = settings!.initialFunds;
      const monthlyRate = returnRate / 12;
      const months = settings!.years * 12;
      for (let month = 1; month <= months; month++) {
        balance = balance * (1 + monthlyRate) + (settings!.personalContribution + settings!.companyContribution);
      }
      return Math.round(balance);
  }
};

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xl },
  header: { marginBottom: theme.spacing.l },
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
  projectionsContainer: {
    marginTop: theme.spacing.l,
    padding: theme.spacing.m,
    backgroundColor: '#F0F9FF',
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
  projectionValue: {
    ...theme.typography.h3,
    fontSize: 16,
  },
  projectionGain: {
    ...theme.typography.caption,
    color: theme.colors.success,
  },
});
