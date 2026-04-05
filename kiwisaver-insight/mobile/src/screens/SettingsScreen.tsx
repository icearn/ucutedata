import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Alert, View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserSettings } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveUserProfile } from '../services/user';
import { KIWISAVER_SCHEMES } from '../constants/schemes';
import { Search, ChevronDown, Check, DollarSign, TrendingUp, Calendar } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const LEGACY_SCHEME_NAME_ALIASES: Record<string, string> = {
  'ANZ Default KiwiSaver Scheme': 'ANZ KiwiSaver Conservative Fund',
  'ANZ Cash Fund': 'ANZ KiwiSaver Cash Fund',
  'ANZ KiwiSaver Balanced Growth': 'ANZ KiwiSaver Balanced Growth Fund',
  'ANZ KiwiSaver Growth': 'ANZ KiwiSaver Growth Fund',
  'ASB KiwiSaver Conservative': 'ASB KiwiSaver Conservative Fund',
  'ASB KiwiSaver NZ Cash': 'ASB KiwiSaver NZ Cash Fund',
  'ASB NZ Cash Fund': 'ASB KiwiSaver NZ Cash Fund',
  'ASB KiwiSaver Moderate': 'ASB KiwiSaver Moderate Fund',
  'ASB KiwiSaver Growth': 'ASB KiwiSaver Growth Fund',
  'Westpac KiwiSaver Conservative': 'Westpac KiwiSaver Conservative Fund',
  'Westpac KiwiSaver Cash': 'Westpac KiwiSaver Cash Fund',
  'Westpac Cash Fund': 'Westpac KiwiSaver Cash Fund',
  'Westpac KiwiSaver Balanced': 'Westpac KiwiSaver Balanced Fund',
  'Westpac KiwiSaver Growth': 'Westpac KiwiSaver Growth Fund',
};

const normalizeSchemeName = (name: string) => LEGACY_SCHEME_NAME_ALIASES[name] || name;

export const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [settings, setSettings] = useState<UserSettings>({
    initialFunds: 10000,
    personalContribution: 200,
    companyContribution: 60,
    years: 30,
    selectedScheme: KIWISAVER_SCHEMES[0]?.name ?? 'ANZ KiwiSaver Conservative Fund',
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({
          ...parsedSettings,
          selectedScheme: normalizeSchemeName(parsedSettings.selectedScheme),
        });
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
      saveUserProfile(settings).catch(err => console.log('Remote save failed', err));
      navigation.replace('Main');
    } catch (e) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const filteredSchemes = useMemo(() => {
    if (!searchQuery) return KIWISAVER_SCHEMES;
    const query = searchQuery.toLowerCase();
    return KIWISAVER_SCHEMES.filter(
      scheme =>
        scheme.name.toLowerCase().includes(query) ||
        scheme.provider.toLowerCase().includes(query) ||
        scheme.type.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const renderSchemeItem = ({ item }: { item: typeof KIWISAVER_SCHEMES[0] }) => (
    <TouchableOpacity
      style={[
        styles.schemeItem,
        settings.selectedScheme === item.name && styles.schemeItemSelected
      ]}
      onPress={() => {
        setSettings({ ...settings, selectedScheme: item.name });
        setModalVisible(false);
        setSearchQuery('');
      }}
    >
      <View>
        <Text style={styles.schemeName}>{item.name}</Text>
        <Text style={styles.schemeDetails}>{item.provider} 鈥?{item.type}</Text>
      </View>
      {settings.selectedScheme === item.name && (
        <Check size={20} color={theme.colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={theme.typography.h2}>Setup Your KiwiSaver</Text>
          <Text style={theme.typography.caption}>Configure your initial investment parameters</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Initial Funds</Text>
          </View>
          <Input
            value={settings.initialFunds.toString()}
            onChangeText={(text) => setSettings({ ...settings, initialFunds: Number(text) })}
            keyboardType="numeric"
            placeholder="Enter initial amount"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={theme.colors.success} />
            <Text style={styles.sectionTitle}>Monthly Contributions</Text>
          </View>
          <Input
            label="Personal Contribution"
            value={settings.personalContribution.toString()}
            onChangeText={(text) => setSettings({ ...settings, personalContribution: Number(text) })}
            keyboardType="numeric"
          />
          <Input
            label="Company Contribution"
            value={settings.companyContribution.toString()}
            onChangeText={(text) => setSettings({ ...settings, companyContribution: Number(text) })}
            keyboardType="numeric"
          />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Monthly</Text>
            <Text style={styles.totalValue}>
              ${(settings.personalContribution + settings.companyContribution).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={theme.colors.warning} />
            <Text style={styles.sectionTitle}>Investment Period (Years)</Text>
          </View>
          <Input
            value={settings.years.toString()}
            onChangeText={(text) => setSettings({ ...settings, years: Number(text) })}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Select KiwiSaver Scheme</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.selectorText}>{settings.selectedScheme}</Text>
            <ChevronDown size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Button title="Save & Continue" onPress={handleSave} />
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={theme.typography.h3}>Select Scheme</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search schemes..."
              style={styles.searchInput}
            />
          </View>

          <FlatList
            data={filteredSchemes}
            renderItem={renderSchemeItem}
            keyExtractor={item => item.name}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </Modal>
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
  section: {
    marginBottom: theme.spacing.l,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
    gap: theme.spacing.s,
  },
  sectionTitle: {
    ...theme.typography.h3,
    fontSize: 16,
  },
  label: {
    ...theme.typography.body,
    marginBottom: theme.spacing.s,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.s,
    paddingTop: theme.spacing.s,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  totalValue: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectorText: {
    ...theme.typography.body,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  closeButton: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: theme.spacing.m,
    backgroundColor: theme.colors.card,
  },
  searchIcon: {
    position: 'absolute',
    left: 24,
    top: 28,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: 40,
  },
  listContent: {
    padding: theme.spacing.m,
  },
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
  schemeItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary,
  },
  schemeName: {
    ...theme.typography.body,
    fontWeight: '500',
  },
  schemeDetails: {
    ...theme.typography.caption,
    marginTop: 2,
  },
});
