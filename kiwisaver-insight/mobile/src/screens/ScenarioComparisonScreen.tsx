import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/Card';
import { theme } from '../constants/theme';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSettings } from '../types';
import { Check, TrendingUp } from 'lucide-react-native';

type ScenarioType = 'same' | 'worst' | 'normal' | 'best';

type ScenarioConfig = {
  id: ScenarioType;
  label: string;
  description: string;
  color: string;
  returnRate: number;
};

const SCENARIO_CONFIGS: ScenarioConfig[] = [
  {
    id: 'same',
    label: 'Stay with Same Scheme',
    description: 'Continue with your current scheme',
    color: '#3b82f6',
    returnRate: 0.065,
  },
  {
    id: 'worst',
    label: 'Worst Choice Scheme',
    description: 'Consistently choosing underperforming schemes',
    color: '#ef4444',
    returnRate: 0.03,
  },
  {
    id: 'normal',
    label: 'Normal Switch Scheme',
    description: 'Periodic switches to average performers',
    color: '#f59e0b',
    returnRate: 0.055,
  },
  {
    id: 'best',
    label: 'Best Luck Jump Scheme',
    description: 'Switching to top-performing schemes',
    color: '#10b981',
    returnRate: 0.085,
  },
];

export const ScenarioComparisonScreen = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [selectedScenarios, setSelectedScenarios] = useState<ScenarioType[]>(['same']);
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

  const toggleScenario = (scenarioId: ScenarioType) => {
    if (selectedScenarios.includes(scenarioId)) {
      if (selectedScenarios.length > 1) {
        setSelectedScenarios(selectedScenarios.filter(id => id !== scenarioId));
      }
    } else {
      setSelectedScenarios([...selectedScenarios, scenarioId]);
    }
  };

  const chartData = useMemo(() => {
    if (!settings) return null;

    const labels: string[] = [];
    const datasets: { data: number[], color: (opacity: number) => string, strokeWidth: number }[] = [];
    const monthlyContribution = settings.personalContribution + settings.companyContribution;

    // Generate labels (years) - simplify to every 5 years to avoid clutter
    for (let year = 0; year <= settings.years; year += 5) {
      labels.push(year.toString());
    }
    if (settings.years % 5 !== 0) labels.push(settings.years.toString());

    selectedScenarios.forEach(scenarioId => {
      const scenario = SCENARIO_CONFIGS.find(s => s.id === scenarioId);
      if (!scenario) return;

      const data: number[] = [];
      for (let year = 0; year <= settings.years; year += 5) { // Match labels
         let balance = settings.initialFunds;
         const monthlyRate = scenario.returnRate / 12;
         const months = year * 12;

         for (let month = 1; month <= months; month++) {
           balance = balance * (1 + monthlyRate) + monthlyContribution;
         }
         data.push(balance);
      }
      // Add final year if needed
      if (settings.years % 5 !== 0) {
          let balance = settings.initialFunds;
          const monthlyRate = scenario.returnRate / 12;
          const months = settings.years * 12;
          for (let month = 1; month <= months; month++) {
             balance = balance * (1 + monthlyRate) + monthlyContribution;
          }
          data.push(balance);
      }

      datasets.push({
        data,
        color: (opacity = 1) => scenario.color,
        strokeWidth: 2
      });
    });

    return { labels, datasets };
  }, [settings, selectedScenarios]);

  const finalValues = useMemo(() => {
    if (!settings) return {};
    const values: Record<string, number> = {};
    const monthlyContribution = settings.personalContribution + settings.companyContribution;

    selectedScenarios.forEach(scenarioId => {
      const scenario = SCENARIO_CONFIGS.find(s => s.id === scenarioId);
      if (!scenario) return;

      let balance = settings.initialFunds;
      const monthlyRate = scenario.returnRate / 12;
      const months = settings.years * 12;

      for (let month = 1; month <= months; month++) {
        balance = balance * (1 + monthlyRate) + monthlyContribution;
      }
      values[scenario.label] = Math.round(balance);
    });
    return values;
  }, [settings, selectedScenarios]);

  if (loading || !settings) {
    return (
      <ScreenContainer>
        <Text>Loading...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={theme.typography.h2}>Investment Scenarios</Text>
          <Text style={theme.typography.caption}>Compare different investment strategies</Text>
        </View>

        <View style={styles.scenariosContainer}>
          {SCENARIO_CONFIGS.map(scenario => (
            <TouchableOpacity
              key={scenario.id}
              style={[
                styles.scenarioButton,
                selectedScenarios.includes(scenario.id) && styles.scenarioButtonSelected
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
              <Text style={styles.scenarioRate}>Est. return: {(scenario.returnRate * 100).toFixed(1)}%</Text>
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
              width={Dimensions.get("window").width - 64}
              height={220}
              yAxisLabel="$"
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: theme.colors.card,
                backgroundGradientFrom: theme.colors.card,
                backgroundGradientTo: theme.colors.card,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "0" },
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
              formatYLabel={(y) => (Number(y) / 1000).toFixed(0) + 'k'}
            />
          )}
        </Card>

        <View style={styles.summaryContainer}>
          <Text style={theme.typography.h3}>Final Values ({settings.years} years)</Text>
          {SCENARIO_CONFIGS.filter(s => selectedScenarios.includes(s.id)).map(scenario => (
            <View key={scenario.id} style={styles.summaryRow}>
              <View style={styles.summaryLabelRow}>
                <View style={[styles.colorDot, { backgroundColor: scenario.color }]} />
                <Text style={styles.summaryLabel}>{scenario.label}</Text>
              </View>
              <Text style={styles.summaryValue}>
                ${finalValues[scenario.label]?.toLocaleString()}
              </Text>
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
    backgroundColor: '#EFF6FF',
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
  scenarioRate: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '500',
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
  summaryContainer: {
    marginTop: theme.spacing.l,
    padding: theme.spacing.m,
    backgroundColor: '#F0F9FF',
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
  },
  summaryLabel: {
    ...theme.typography.body,
  },
  summaryValue: {
    ...theme.typography.body,
    fontWeight: 'bold',
  },
});
