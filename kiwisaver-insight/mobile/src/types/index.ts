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
export type SchemeRiskBucket = 'aggressive' | 'growth' | 'balanced' | 'conservative';

export type SwitchCondition = {
  id: string;
  type: 'price_drop' | 'price_rise' | 'time_based' | 'market_volatility' | 'performance_threshold';
  label: string;
  from_scheme: SchemeRiskBucket;
  to_scheme: SchemeRiskBucket;
  threshold: number;
  threshold_unit: '%' | 'years' | 'ratio';
};

export type ProjectionModel = {
  label: string;
  annualized_return: number;
  monthly_model_return: number;
  annualized_volatility: number;
  source_months: number;
  source_start?: string | null;
  source_end?: string | null;
};

export type ProjectionCheckpoint = {
  years_ahead: number;
  total_years: number;
  projected_value: number;
  projected_gain: number;
  projected_total_return: number;
};

export type SimulationPoint = {
  date: string;
  month: number;
  balance: number;
  invested: number;
  returns: number;
  scheme: string;
  provider_scheme?: string;
  monthly_return_pct?: number;
  phase?: 'backtest' | 'projection';
};

export type SimulationResult = {
  data: SimulationPoint[];
  switches: {
    month: number;
    date?: string;
    from: string;
    to: string;
    reason: string;
  }[];
  final_balance: number;
  total_invested: number;
  actual_window?: {
    provider: string;
    start_date: string;
    end_date: string;
    point_count: number;
    source_months: number;
  } | null;
  model?: ProjectionModel;
  future_projections?: ProjectionCheckpoint[];
  start_scheme?: {
    id?: string;
    name: string;
    provider?: string;
    scheme?: string;
    type?: string;
    color?: string;
  };
};

export type ScenarioProjectionPoint = {
  year: number;
  balance: number;
  invested: number;
  returns: number;
};

export type ScenarioResult = {
  id: ScenarioType;
  label: string;
  description: string;
  color: string;
  source_scheme: {
    id: string;
    name: string;
    provider: string;
    scheme: string;
    type: string;
    color: string;
  };
  backtest: {
    start_date: string;
    end_date: string;
    point_count: number;
    source_months: number;
    final_balance: number;
    total_invested: number;
    total_return: number;
  };
  model: ProjectionModel;
  projection: ScenarioProjectionPoint[];
  final_value: number;
  total_return: number;
  total_invested: number;
};

export type ScenarioComparisonResponse = {
  requested_years: number;
  selected_scheme: {
    id: string;
    name: string;
    provider: string;
    scheme: string;
    type: string;
    color: string;
  } | null;
  scenario_backtest_window: {
    calibration_years: number;
    max_actual_years_used: number;
  } | null;
  scenarios: ScenarioResult[];
  best_scenario_id: ScenarioType | null;
  future_projections: ProjectionCheckpoint[];
};

export type StrategyRecommendationCandidate = {
  id: string;
  label: string;
  audience: string;
  summary: string;
  style: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  switch_rules: Array<{
    id: string;
    type: string;
    label: string;
    from_scheme: SchemeRiskBucket;
    to_scheme: SchemeRiskBucket;
    threshold: number;
    threshold_unit: string;
  }>;
  backtest: {
    final_balance: number;
    total_invested: number;
    total_return: number;
    annualized_return: number;
    annualized_volatility: number;
    max_drawdown_pct: number;
    switch_count: number;
    source_months: number;
    start_date: string;
    end_date: string;
    provider: string;
  };
  future_projections: ProjectionCheckpoint[];
  start_scheme?: {
    id?: string;
    name?: string;
    provider?: string;
    scheme?: string;
    type?: string;
    color?: string;
  };
  review_cycle: string;
  comparison_to_baseline: {
    baseline_strategy_id: string;
    baseline_strategy_label: string;
    final_balance_delta: number;
    final_balance_delta_pct: number;
  };
  why_recommended: string[];
};

export type StrategyRecommendationResponse = {
  generated_at: string;
  user_id?: string | null;
  selected_scheme: {
    id: string;
    name: string;
    provider: string;
    scheme: string;
    type: string;
    color: string;
  };
  risk_preference: string;
  objective: string;
  recommended_strategy: StrategyRecommendationCandidate;
  top_strategies: StrategyRecommendationCandidate[];
  review_cycle: string;
  disclaimer: string;
  recommendation_record?: {
    id: number;
    created_at: string;
  };
};
