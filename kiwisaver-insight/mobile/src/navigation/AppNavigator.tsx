import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LegalDisclaimerScreen } from '../screens/LegalDisclaimerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ScenarioComparisonScreen } from '../screens/ScenarioComparisonScreen';
import { HistoricalPricesScreen } from '../screens/HistoricalPricesScreen';
import { ResultsSummaryScreen } from '../screens/ResultsSummaryScreen';
import { RootStackParamList, MainTabParamList } from '../types';
import { theme } from '../constants/theme';
import { Home, History, FileText, Settings } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// TODO: Add AuthNavigator here when login is implemented
// const AuthStack = createNativeStackNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
      }}
    >
      <Tab.Screen 
        name="Scenarios" 
        component={ScenarioComparisonScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Historical" 
        component={HistoricalPricesScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Summary" 
        component={ResultsSummaryScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Legal"
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen 
          name="Legal" 
          component={LegalDisclaimerScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ title: 'Settings' }}
        />
        <Stack.Screen 
          name="Main" 
          component={MainTabs} 
          options={({ navigation }) => ({
            title: 'KiwiSaver Insight',
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                <Settings color={theme.colors.text} size={24} />
              </TouchableOpacity>
            ),
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
