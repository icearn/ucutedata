import { SchemeData } from '../types';

export const ANALYSIS_SCHEMES: SchemeData[] = [
  { id: '1', name: 'ANZ KiwiSaver Conservative Fund', provider: 'ANZ', type: 'Conservative', color: '#2563eb' },
  { id: '13', name: 'ANZ KiwiSaver Cash Fund', provider: 'ANZ', type: 'Cash', color: '#0f766e' },
  { id: '2', name: 'ANZ KiwiSaver Balanced Growth Fund', provider: 'ANZ', type: 'Balanced', color: '#4f46e5' },
  { id: '3', name: 'ANZ KiwiSaver Growth Fund', provider: 'ANZ', type: 'Growth', color: '#7c3aed' },
  { id: '4', name: 'ANZ KiwiSaver High Growth Fund', provider: 'ANZ', type: 'Aggressive', color: '#0ea5e9' },
  { id: '5', name: 'ASB KiwiSaver Conservative Fund', provider: 'ASB', type: 'Conservative', color: '#16a34a' },
  { id: '14', name: 'ASB KiwiSaver NZ Cash Fund', provider: 'ASB', type: 'Cash', color: '#15803d' },
  { id: '6', name: 'ASB KiwiSaver Moderate Fund', provider: 'ASB', type: 'Balanced', color: '#14b8a6' },
  { id: '7', name: 'ASB KiwiSaver Growth Fund', provider: 'ASB', type: 'Growth', color: '#f59e0b' },
  { id: '8', name: 'ASB KiwiSaver Aggressive Fund', provider: 'ASB', type: 'Aggressive', color: '#f97316' },
  { id: '9', name: 'Westpac KiwiSaver Conservative Fund', provider: 'Westpac', type: 'Conservative', color: '#991b1b' },
  { id: '15', name: 'Westpac KiwiSaver Cash Fund', provider: 'Westpac', type: 'Cash', color: '#7f1d1d' },
  { id: '10', name: 'Westpac KiwiSaver Balanced Fund', provider: 'Westpac', type: 'Balanced', color: '#dc2626' },
  { id: '11', name: 'Westpac KiwiSaver Growth Fund', provider: 'Westpac', type: 'Growth', color: '#ef4444' },
  { id: '12', name: 'Westpac KiwiSaver High Growth Fund', provider: 'Westpac', type: 'Aggressive', color: '#b91c1c' },
];

export const KIWISAVER_SCHEMES = ANALYSIS_SCHEMES;

export const SCHEME_PROVIDERS = Array.from(
  new Set(ANALYSIS_SCHEMES.map((scheme) => scheme.provider))
);

export const SCHEME_RISK_LEVELS = ['Aggressive', 'Growth', 'Balanced', 'Conservative', 'Cash'];
