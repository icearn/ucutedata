import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { fetchCurrentSchemeAnalysis } from '../services/api';
import { theme } from '../constants/theme';
import { SchemeData, TimePeriod } from '../types';
import { Calendar, TrendingUp, Award, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;

const AVAILABLE_SCHEMES: SchemeData[] = [
  { id: '1', name: 'ANZ Default KiwiSaver Scheme', provider: 'ANZ', type: 'Conservative', color: '#3b82f6' },
  { id: '2', name: 'ANZ KiwiSaver Growth', provider: 'ANZ', type: 'Growth', color: '#8b5cf6' },
  { id: '3', name: 'ASB KiwiSaver Conservative', provider: 'ASB', type: 'Conservative', color: '#10b981' },
  { id: '4', name: 'ASB KiwiSaver Growth', provider: 'ASB', type: 'Growth', color: '#f59e0b' },
  { id: '5', name: 'Simplicity KiwiSaver Growth', provider: 'Simplicity', type: 'Growth', color: '#ec4899' },
  { id: '6', name: 'BNZ KiwiSaver Balanced', provider: 'BNZ', type: 'Balanced', color: '#06b6d4' },
];

const PERIODS: { label: string; value: TimePeriod; years: number }[] = [
  { label: '1Y', value: '1Y', years: 1 },
  { label: '3Y', value: '3Y', years: 3 },
  { label: '5Y', value: '5Y', years: 5 },
  { label: '10Y', value: '10Y', years: 10 },
];

export const CurrentSchemeAnalysisScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('10Y');
  const [selectedSchemes, setSelectedSchemes] = useState<SchemeData[]>([AVAILABLE_SCHEMES[0]]);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [showPercentage, setShowPercentage] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (userSettings) {
      loadAnalysis();
    }
  }, [userSettings, selectedPeriod, selectedSchemes]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setUserSettings(JSON.parse(savedSettings));
      } else {
        // Default settings if none found
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
      const period = PERIODS.find(p => p.value === selectedPeriod)!;
      const monthlyContribution = (userSettings.personalContribution || 0) + (userSettings.companyContribution || 0);
      
      const data = await fetchCurrentSchemeAnalysis(
        selectedSchemes.map(s => s.id),
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

  const toggleScheme = (scheme: SchemeData) => {
    const isSelected = selectedSchemes.find(s => s.id === scheme.id);
    if (isSelected) {
      if (selectedSchemes.length > 1) {
        setSelectedSchemes(selectedSchemes.filter(s => s.id !== scheme.id));
      }
    } else {
      if (selectedSchemes.length < 4) {
        setSelectedSchemes([...selectedSchemes, scheme]);
      }
    }
  };

  const chartData = useMemo(() => {
    if (analysisResults.length === 0) return null;

    // Find the result with the most data points to use as labels source
    const baseResult = analysisResults[0];
    if (!baseResult.history || baseResult.history.length === 0) return null;

    // Downsample labels for readability
    const labelInterval = Math.ceil(baseResult.history.length / 6);
    const labels = baseResult.history
      .filter((_: any, i: number) => i % labelInterval === 0)
      .map((d: any) => {
        const date = new Date(d.date);
        return `${date.getFullYear()}`;
      });

    const datasets = analysisResults.map((result: any, index: number) => {
      const scheme = AVAILABLE_SCHEMES.find(s => s.id === result.scheme.id);
      
      let data = result.history.map((h: any) => h.price);
      
      if (showPercentage && data.length > 0) {
        const startPrice = data[0];
        data = data.map((price: number) => ((price - startPrice) / startPrice) * 100);
      }

      return {
        data,
        color: (opacity = 1) => scheme?.color || `rgba(0, 0, 0, ${opacity})`,
        strokeWidth: 2,
      };
    });

    return {
      labels,
      datasets,
      legend: analysisResults.map((r: any) => r.scheme.name.split(' ').slice(0, 2).join(' ')),
    };
  }, [analysisResults, showPercentage]);

  const bestPerformer = useMemo(() => {
    if (analysisResults.length === 0) return null;
    return analysisResults.reduce((best, current) => 
      current.outcome.final_value > best.outcome.final_value ? current : best
    );
  }, [analysisResults]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Current Scheme Analysis</Text>
          <Text style={styles.subtitle}>Compare historical performance</Text>
        </View>

        {/* Welcome Banner */}
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
                Compare schemes and see how your investment would have grown over time.
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Period Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Period</Text>
          <View style={styles.periodContainer}>
            {PERIODS.map(period => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.value && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period.value)}
              >
                <Text style={[
                  styles.periodText,
                  selectedPeriod === period.value && styles.periodTextActive
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Scheme Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Schemes (Max 4)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.schemesScroll}>
            {AVAILABLE_SCHEMES.map(scheme => {
              const isSelected = !!selectedSchemes.find(s => s.id === scheme.id);
              return (
                <TouchableOpacity
                  key={scheme.id}
                  style={[
                    styles.schemeCard,
                    isSelected && { borderColor: scheme.color, backgroundColor: `${scheme.color}10` }
                  ]}
                  onPress={() => toggleScheme(scheme)}
                >
                  <View style={[styles.colorDot, { backgroundColor: scheme.color }]} />
                  <View>
                    <Text style={styles.schemeName} numberOfLines={1}>{scheme.name}</Text>
                    <Text style={styles.schemeProvider}>{scheme.provider}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Chart */}
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : chartData ? (
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
            <LineChart
              data={chartData}
              width={SCREEN_WIDTH - 32}
              height={220}
              yAxisSuffix={showPercentage ? '%' : ''}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: '0' },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        ) : null}

        {/* Outcomes */}
        {analysisResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projected Outcomes</Text>
            {analysisResults.map((result: any) => {
              const scheme = AVAILABLE_SCHEMES.find(s => s.id === result.scheme.id);
              return (
                <View key={result.scheme.id} style={[styles.outcomeCard, { borderLeftColor: scheme?.color }]}>
                  <Text style={styles.outcomeTitle}>{result.scheme.name}</Text>
                  <View style={styles.outcomeRow}>
                    <Text style={styles.outcomeLabel}>Final Value</Text>
                    <Text style={styles.outcomeValue}>${result.outcome.final_value.toLocaleString()}</Text>
                  </View>
                  <View style={styles.outcomeRow}>
                    <Text style={styles.outcomeLabel}>Total Return</Text>
                    <Text style={[styles.outcomeValue, { color: result.outcome.total_return >= 0 ? 'green' : 'red' }]}>
                      ${result.outcome.total_return.toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Best Performer */}
        {bestPerformer && (
          <LinearGradient
            colors={['#fffbeb', '#fff7ed']}
            style={styles.bestPerformerCard}
          >
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
  schemesScroll: {
    flexGrow: 0,
  },
  schemeCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    width: 160,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  schemeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  schemeProvider: {
    fontSize: 12,
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
});
