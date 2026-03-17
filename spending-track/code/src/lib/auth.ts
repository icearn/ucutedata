import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const AUTH_KEY = 'auth_token';

export const signIn = async () => {
  await SecureStore.setItemAsync(AUTH_KEY, 'dummy-token');
};

export const signOut = async () => {
  await SecureStore.deleteItemAsync(AUTH_KEY);
  router.replace('/auth/login');
};

export const isAuthenticated = async () => {
  const token = await SecureStore.getItemAsync(AUTH_KEY);
  return !!token;
};
