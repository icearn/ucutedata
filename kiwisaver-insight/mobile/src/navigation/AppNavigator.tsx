import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LegalDisclaimerScreen } from '../screens/LegalDisclaimerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ScenarioComparisonScreen } from '../screens/ScenarioComparisonScreen';
import { HistoricalPricesScreen } from '../screens/HistoricalPricesScreen';
import { ResultsSummaryScreen } from '../screens/ResultsSummaryScreen';
import { CurrentSchemeAnalysisScreen } from '../screens/CurrentSchemeAnalysisScreen';
import { StrategyBuilderScreen } from '../screens/StrategyBuilderScreen';
import { RootStackParamList, MainTabParamList } from '../types';
import { theme } from '../constants/theme';
import { Home, History, FileText, Settings, TrendingUp, Zap, BarChart2, LineChart as LineChartIcon, PieChart } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
      }}
    >
      <Tab.Screen 
        name="Analysis" 
        component={CurrentSchemeAnalysisScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} />,
          tabBarLabel: 'Analysis'
        }}
      />
      <Tab.Screen 
        name="Strategy" 
        component={StrategyBuilderScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Zap color={color} size={size} />,
          tabBarLabel: 'Strategy'
        }}
      />
      <Tab.Screen 
        name="Scenarios" 
        component={ScenarioComparisonScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
          tabBarLabel: 'Scenarios'
        }}
      />
      <Tab.Screen 
        name="Historical" 
        component={HistoricalPricesScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <LineChartIcon color={color} size={size} />,
          tabBarLabel: 'Historical'
        }}
      />
      <Tab.Screen 
        name="Summary" 
        component={ResultsSummaryScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <PieChart color={color} size={size} />,
          tabBarLabel: 'Summary'
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
