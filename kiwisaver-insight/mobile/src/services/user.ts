import api from './api';
import { UserSettings } from '../types';

export const saveUserProfile = async (settings: UserSettings) => {
  try {
    // Mock user ID for now
    const userId = 'user_123';
    
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
