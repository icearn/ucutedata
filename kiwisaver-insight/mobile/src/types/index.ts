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
  Scenarios: undefined;
  Historical: undefined;
  Summary: undefined;
};
