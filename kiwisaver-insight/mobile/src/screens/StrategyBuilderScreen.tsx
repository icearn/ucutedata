import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runStrategyBacktest } from '../services/api';
import { theme } from '../constants/theme';
import { SwitchCondition, SimulationResult } from '../types';
import { Zap, Plus, Trash2, Play, ArrowRightLeft, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;

const CONDITION_TYPES = [
  { type: 'price_drop', label: 'Price Drop Below', unit: '%' },
  { type: 'price_rise', label: 'Price Rise Above', unit: '%' },
  { type: 'time_based', label: 'Time-Based Switch', unit: 'years' },
  { type: 'market_volatility', label: 'Market Volatility', unit: '%' },
  { type: 'performance_threshold', label: 'Performance Threshold', unit: 'ratio' },
];

const SCHEME_TYPES = [
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'conservative', label: 'Conservative' },
];

export const StrategyBuilderScreen = () => {
  const [loading, setLoading] = useState(false);
  const [userSettings, setUserSettings] = useState<any>(null);
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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setUserSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings', error);
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
      setConditions(conditions.filter(c => c.id !== id));
    } else {
      Alert.alert('Cannot remove', 'You must have at least one condition.');
    }
  };

  const updateCondition = (id: string, updates: Partial<SwitchCondition>) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleRunBacktest = async () => {
    if (!userSettings) return;
    setLoading(true);
    try {
      const monthlyContribution = (userSettings.personalContribution || 0) + (userSettings.companyContribution || 0);
      const result = await runStrategyBacktest(
        conditions,
        userSettings.initialFunds || 10000,
        monthlyContribution
      );
      setSimulation(result);
    } catch (error) {
      console.error('Backtest failed', error);
      Alert.alert('Error', 'Failed to run backtest. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Strategy Builder</Text>
          <Text style={styles.subtitle}>Automate your investment strategy</Text>
        </View>

        {/* Info Banner */}
        <LinearGradient
          colors={['#a855f7', '#ec4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <Zap color="#fff" size={24} />
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Build Your Strategy</Text>
            <Text style={styles.bannerText}>
              Create rules to switch schemes based on market conditions and backtest against historical data.
            </Text>
          </View>
        </LinearGradient>

        {/* Conditions List */}
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

              {/* Type Select */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Condition Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                  {CONDITION_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.type}
                      style={[
                        styles.typeButton,
                        condition.type === type.type && styles.typeButtonActive
                      ]}
                      onPress={() => updateCondition(condition.id, {
                        type: type.type as any,
                        label: type.label,
                        threshold_unit: type.unit as any
                      })}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        condition.type === type.type && styles.typeButtonTextActive
                      ]}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.row}>
                {/* From Scheme */}
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>When in</Text>
                  <View style={styles.pickerContainer}>
                    {SCHEME_TYPES.map(scheme => (
                      <TouchableOpacity
                        key={scheme.value}
                        style={[
                          styles.pickerButton,
                          condition.from_scheme === scheme.value && styles.pickerButtonActive
                        ]}
                        onPress={() => updateCondition(condition.id, { from_scheme: scheme.value as any })}
                      >
                        <Text style={[
                          styles.pickerText,
                          condition.from_scheme === scheme.value && styles.pickerTextActive
                        ]}>{scheme.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* To Scheme */}
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Switch to</Text>
                  <View style={styles.pickerContainer}>
                    {SCHEME_TYPES.map(scheme => (
                      <TouchableOpacity
                        key={scheme.value}
                        style={[
                          styles.pickerButton,
                          condition.to_scheme === scheme.value && styles.pickerButtonActive
                        ]}
                        onPress={() => updateCondition(condition.id, { to_scheme: scheme.value as any })}
                      >
                        <Text style={[
                          styles.pickerText,
                          condition.to_scheme === scheme.value && styles.pickerTextActive
                        ]}>{scheme.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Threshold */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Threshold ({condition.threshold_unit})</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={condition.threshold.toString()}
                  onChangeText={(text) => updateCondition(condition.id, { threshold: parseFloat(text) || 0 })}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity
            onPress={handleRunBacktest}
            disabled={loading}
          >
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
                  <Text style={styles.runButtonText}>Run Backtest (10 Years)</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {simulation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Backtest Results</Text>
            
            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  labels: simulation.data
                    .filter((_, i) => i % 24 === 0) // Show label every 2 years
                    .map(d => new Date(d.date).getFullYear().toString()),
                  datasets: [
                    {
                      data: simulation.data.map(d => d.balance),
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue
                      strokeWidth: 2,
                    },
                    {
                      data: simulation.data.map(d => d.invested),
                      color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`, // Slate
                      strokeWidth: 2,
                    }
                  ],
                  legend: ['Strategy Balance', 'Total Invested']
                }}
                width={SCREEN_WIDTH - 32}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: '0' },
                }}
                bezier
                style={styles.chart}
              />
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Final Balance</Text>
                <Text style={styles.statValue}>${simulation.final_balance.toLocaleString()}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Return</Text>
                <Text style={[styles.statValue, { color: 'green' }]}>
                  {((simulation.final_balance / simulation.total_invested - 1) * 100).toFixed(1)}%
                </Text>
              </View>
            </View>

            {simulation.switches.length > 0 && (
              <View style={styles.switchesCard}>
                <View style={styles.switchesHeader}>
                  <ArrowRightLeft color="#b45309" size={20} />
                  <Text style={styles.switchesTitle}>Switches ({simulation.switches.length})</Text>
                </View>
                {simulation.switches.map((sw, idx) => (
                  <Text key={idx} style={styles.switchText}>
                    • Month {sw.month}: {sw.from} → {sw.to} ({sw.reason})
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
    marginBottom: 24,
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
    color: '#f3e8ff',
    fontSize: 14,
    lineHeight: 20,
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
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
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
