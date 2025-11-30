import React from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Button } from '../components/Button';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Legal'>;

export const LegalDisclaimerScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleAccept = async () => {
    await AsyncStorage.setItem('hasAcceptedLegal', 'true');
    navigation.replace('Settings');
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Personal Insights</Text>
        <Text style={styles.subtitle}>AI-Driven Financial Analysis</Text>

        <Text style={styles.sectionTitle}>Legal Notice & Disclaimer</Text>
        
        <Text style={styles.heading}>Important Information</Text>
        <Text style={styles.text}>
          This application provides general financial information and projections based on historical data and assumptions. 
          It is for educational and informational purposes only and does not constitute financial advice.
        </Text>

        <Text style={styles.heading}>No Financial Advice</Text>
        <Text style={styles.text}>
          The insights, projections, and analysis provided by this tool should not be considered as professional financial, 
          investment, or tax advice. Always consult with a qualified financial advisor before making investment decisions.
        </Text>

        <Text style={styles.heading}>Accuracy & Limitations</Text>
        <Text style={styles.text}>
          While we strive to provide accurate information, historical performance is not indicative of future results. 
          Market conditions, scheme performance, and personal circumstances can significantly impact actual outcomes.
        </Text>

        <Text style={styles.heading}>Privacy & Data</Text>
        <Text style={styles.text}>
          Your personal financial data is stored locally on your device. We do not collect, store, or transmit your 
          sensitive information to external servers. This app is not designed for collecting personally identifiable 
          information (PII) or securing highly sensitive data.
        </Text>

        <Text style={styles.heading}>KiwiSaver Schemes</Text>
        <Text style={styles.text}>
          Scheme information and unit prices are based on publicly available data. For official scheme information, 
          always refer to the provider's official documentation and disclosures.
        </Text>

        <Text style={styles.heading}>Your Responsibility</Text>
        <Text style={styles.text}>
          By using this application, you acknowledge that you are responsible for your own financial decisions and 
          that the creators of this tool accept no liability for any financial losses or decisions made based on 
          the information provided.
        </Text>
      </ScrollView>
      <Button title="I Understand and Accept" onPress={handleAccept} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    marginBottom: theme.spacing.s,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.l,
  },
  heading: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.s,
    marginTop: theme.spacing.m,
  },
  text: {
    ...theme.typography.body,
    marginBottom: theme.spacing.m,
    lineHeight: 24,
  },
});
