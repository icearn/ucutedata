import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { UserSettings } from '../types';

const LOCAL_USER_ID_KEY = 'localUserId';

const generateLocalUserId = () => {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi?.randomUUID) {
    return `ksi_${cryptoApi.randomUUID()}`;
  }
  return `ksi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getOrCreateLocalUserId = async () => {
  const existingUserId = await AsyncStorage.getItem(LOCAL_USER_ID_KEY);
  if (existingUserId) {
    return existingUserId;
  }

  const nextUserId = generateLocalUserId();
  await AsyncStorage.setItem(LOCAL_USER_ID_KEY, nextUserId);
  return nextUserId;
};

export const saveUserProfile = async (settings: UserSettings) => {
  try {
    const userId = await getOrCreateLocalUserId();

    const response = await api.post('/api/user/profile', {
      user_id: userId,
      initial_funds: settings.initialFunds,
      personal_contribution: settings.personalContribution,
      company_contribution: settings.companyContribution,
      years: settings.years,
      selected_scheme: settings.selectedScheme,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to save user profile remotely', error);
    throw error;
  }
};
