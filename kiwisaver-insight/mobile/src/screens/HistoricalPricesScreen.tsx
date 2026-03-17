import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal, FlatList } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { theme } from '../constants/theme';
import { LineChart } from 'react-native-chart-kit';
import { Search, TrendingUp, TrendingDown, Calendar, ChevronDown, Check } from 'lucide-react-native';
import { KIWISAVER_SCHEMES } from '../constants/schemes';

type Period = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL';

// Mock current prices and changes for demo
const SCHEMES_WITH_DATA = KIWISAVER_SCHEMES.map((s, i) => ({
  ...s,
  id: i.toString(),
  currentPrice: 1.5 + Math.random(),
  priceChange: (Math.random() - 0.3) * 0.1,
  percentChange: (Math.random() - 0.3) * 5,
}));

const generateHistoricalData = (schemeId: string, period: Period) => {
  const scheme = SCHEMES_WITH_DATA.find(s => s.id === schemeId);
  if (!scheme) return [];

  const dataPoints: { [key: string]: number } = {
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    '3Y': 365 * 3,
    '5Y': 365 * 5,
    'ALL': 365 * 10,
  };

  const days = dataPoints[period];
  const data = [];
  const basePrice = scheme.currentPrice;
  const volatility = scheme.type === 'Growth' ? 0.02 : scheme.type === 'Balanced' ? 0.015 : 0.01;

  // Generate fewer points for mobile performance/chart clarity
  const step = Math.max(1, Math.floor(days / 20)); 

  for (let i = days; i >= 0; i -= step) {
    const trend = (days - i) / days * scheme.percentChange / 100;
    const noise = (Math.random() - 0.5) * volatility;
    const price = basePrice * (1 - trend + noise);
    data.push(price);
  }

  return data;
};

export const HistoricalPricesScreen = () => {
  const [selectedScheme, setSelectedScheme] = useState(SCHEMES_WITH_DATA[0]);
  const [period, setPeriod] = useState<Period>('1Y');
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [comparisonScheme, setComparisonScheme] = useState<typeof SCHEMES_WITH_DATA[0] | null>(null);
  const [compModalVisible, setCompModalVisible] = useState(false);

  const filteredSchemes = useMemo(() => {
    if (!searchQuery) return SCHEMES_WITH_DATA;
    const query = searchQuery.toLowerCase();
    return SCHEMES_WITH_DATA.filter(
      scheme =>
        scheme.name.toLowerCase().includes(query) ||
        scheme.provider.toLowerCase().includes(query) ||
        scheme.type.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const chartData = useMemo(() => {
    const mainData = generateHistoricalData(selectedScheme.id, period);
    const datasets = [
      {
        data: mainData,
        color: (opacity = 1) => theme.colors.primary,
        strokeWidth: 2
      }
    ];

    if (comparisonScheme) {
      const compData = generateHistoricalData(comparisonScheme.id, period);
      // Ensure same length
      if (compData.length > mainData.length) compData.splice(0, compData.length - mainData.length);
      
      datasets.push({
        data: compData,
        color: (opacity = 1) => theme.colors.success,
        strokeWidth: 2
      });
    }

    return {
      labels: [], // Hide labels for cleaner look on mobile
      datasets
    };
  }, [selectedScheme, comparisonScheme, period]);

  const renderSchemeItem = ({ item, isComparison }: { item: typeof SCHEMES_WITH_DATA[0], isComparison: boolean }) => (
    <TouchableOpacity
      style={[
        styles.schemeItem,
        (isComparison ? comparisonScheme?.id : selectedScheme.id) === item.id && styles.schemeItemSelected
      ]}
      onPress={() => {
        if (isComparison) {
          setComparisonScheme(item);
          setCompModalVisible(false);
        } else {
          setSelectedScheme(item);
          setModalVisible(false);
        }
        setSearchQuery('');
      }}
    >
      <View>
        <Text style={styles.schemeName}>{item.name}</Text>
        <Text style={styles.schemeDetails}>{item.provider} • {item.type}</Text>
      </View>
      {(isComparison ? comparisonScheme?.id : selectedScheme.id) === item.id && (
        <Check size={20} color={theme.colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={theme.typography.h2}>Historical Unit Prices</Text>
          <Text style={theme.typography.caption}>Track scheme performance over time</Text>
        </View>

        <TouchableOpacity
          style={styles.selector}
          onPress={() => setModalVisible(true)}
        >
          <View>
            <Text style={styles.selectorLabel}>Selected Scheme</Text>
            <Text style={styles.selectorValue}>{selectedScheme.name}</Text>
          </View>
          <ChevronDown size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <Card style={styles.statsCard}>
          <View>
            <Text style={theme.typography.h1}>${selectedScheme.currentPrice.toFixed(4)}</Text>
            <View style={styles.trendRow}>
              {selectedScheme.percentChange >= 0 ? (
                <TrendingUp size={16} color={theme.colors.success} />
              ) : (
                <TrendingDown size={16} color={theme.colors.danger} />
              )}
              <Text style={[
                styles.trendText,
                { color: selectedScheme.percentChange >= 0 ? theme.colors.success : theme.colors.danger }
              ]}>
                {selectedScheme.percentChange >= 0 ? '+' : ''}{selectedScheme.percentChange.toFixed(2)}%
              </Text>
            </View>
          </View>
        </Card>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
          {(['1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonSelected]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextSelected]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Card>
          <LineChart
            data={chartData}
            width={Dimensions.get("window").width - 64}
            height={220}
            withDots={false}
            withInnerLines={false}
            yAxisLabel="$"
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: theme.colors.card,
              backgroundGradientFrom: theme.colors.card,
              backgroundGradientTo: theme.colors.card,
              decimalPlaces: 2,
              color: (opacity = 1) => theme.colors.primary,
              labelColor: (opacity = 1) => theme.colors.textSecondary,
              propsForDots: { r: "0" },
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </Card>

        <View style={styles.comparisonSection}>
          <Text style={styles.sectionTitle}>Compare With</Text>
          {comparisonScheme ? (
            <View style={styles.comparisonCard}>
              <View style={styles.comparisonHeader}>
                <Text style={styles.comparisonName}>{comparisonScheme.name}</Text>
                <TouchableOpacity onPress={() => setComparisonScheme(null)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.comparisonStats}>
                <Text style={styles.comparisonStatLabel}>Price Diff</Text>
                <Text style={{ 
                  color: selectedScheme.currentPrice > comparisonScheme.currentPrice ? theme.colors.success : theme.colors.danger 
                }}>
                  ${Math.abs(selectedScheme.currentPrice - comparisonScheme.currentPrice).toFixed(4)}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setCompModalVisible(true)}
            >
              <Text style={styles.addButtonText}>+ Add Comparison</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Scheme Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={theme.typography.h3}>Select Scheme</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <Search size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
            <Input value={searchQuery} onChangeText={setSearchQuery} placeholder="Search..." style={styles.searchInput} />
          </View>
          <FlatList
            data={filteredSchemes}
            renderItem={(props) => renderSchemeItem({ ...props, isComparison: false })}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </Modal>

      {/* Comparison Selection Modal */}
      <Modal visible={compModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={theme.typography.h3}>Compare With</Text>
            <TouchableOpacity onPress={() => setCompModalVisible(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <Search size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
            <Input value={searchQuery} onChangeText={setSearchQuery} placeholder="Search..." style={styles.searchInput} />
          </View>
          <FlatList
            data={filteredSchemes.filter(s => s.id !== selectedScheme.id)}
            renderItem={(props) => renderSchemeItem({ ...props, isComparison: true })}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xl },
  header: { marginBottom: theme.spacing.l },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.m,
  },
  selectorLabel: { ...theme.typography.caption },
  selectorValue: { ...theme.typography.body, fontWeight: '500' },
  statsCard: { marginBottom: theme.spacing.m },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  trendText: { marginLeft: 4, fontWeight: '500' },
  periodScroll: { marginBottom: theme.spacing.m, maxHeight: 40 },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  periodButtonSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  periodText: { color: theme.colors.text },
  periodTextSelected: { color: '#fff' },
  comparisonSection: { marginTop: theme.spacing.l },
  sectionTitle: { ...theme.typography.h3, marginBottom: theme.spacing.m },
  comparisonCard: {
    padding: theme.spacing.m,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  comparisonHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.s },
  comparisonName: { fontWeight: '500' },
  removeText: { color: theme.colors.danger },
  comparisonStats: { flexDirection: 'row', justifyContent: 'space-between' },
  comparisonStatLabel: { color: theme.colors.textSecondary },
  addButton: {
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addButtonText: { color: theme.colors.primary, fontWeight: '500' },
  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  closeButton: { color: theme.colors.primary, fontSize: 16, fontWeight: '600' },
  searchContainer: { padding: theme.spacing.m, backgroundColor: theme.colors.card },
  searchIcon: { position: 'absolute', left: 24, top: 28, zIndex: 1 },
  searchInput: { paddingLeft: 40 },
  listContent: { padding: theme.spacing.m },
  schemeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.card,
    marginBottom: theme.spacing.s,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  schemeItemSelected: { backgroundColor: '#EFF6FF', borderColor: theme.colors.primary },
  schemeName: { ...theme.typography.body, fontWeight: '500' },
  schemeDetails: { ...theme.typography.caption, marginTop: 2 },
});
