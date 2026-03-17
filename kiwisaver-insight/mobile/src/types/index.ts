export type UserSettings = {
  initialFunds: number;
  personalContribution: number;
  companyContribution: number;
  years: number;
  selectedScheme: string;
};

export type ScenarioType = 'same' | 'worst' | 'normal' | 'best';

export type RootStackParamList = {
  Legal: undefined;
  Main: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Analysis: undefined;
  Strategy: undefined;
  Scenarios: undefined;
  Historical: undefined;
  Summary: undefined;
};

export type SchemeData = {
  id: string;
  name: string;
  provider: string;
  type: string;
  color: string;
  selected?: boolean;
};

export type TimePeriod = '1Y' | '3Y' | '5Y' | '10Y';

export type SwitchCondition = {
  id: string;
  type: 'price_drop' | 'price_rise' | 'time_based' | 'market_volatility' | 'performance_threshold';
  label: string;
  from_scheme: 'aggressive' | 'balanced' | 'conservative';
  to_scheme: 'aggressive' | 'balanced' | 'conservative';
  threshold: number;
  threshold_unit: '%' | 'years' | 'ratio';
};

export type SimulationResult = {
  data: {
    date: string;
    month: number;
    balance: number;
    invested: number;
    returns: number;
    scheme: string;
  }[];
  switches: {
    month: number;
    from: string;
    to: string;
    reason: string;
  }[];
  final_balance: number;
  total_invested: number;
};
