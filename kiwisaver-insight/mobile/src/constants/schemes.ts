import { SchemeData } from '../types';

export const ANALYSIS_SCHEMES: SchemeData[] = [
  { id: '1', name: 'ANZ Default KiwiSaver Scheme', provider: 'ANZ', type: 'Conservative', color: '#2563eb' },
  { id: '2', name: 'ANZ KiwiSaver Balanced Growth', provider: 'ANZ', type: 'Balanced', color: '#4f46e5' },
  { id: '3', name: 'ANZ KiwiSaver Growth', provider: 'ANZ', type: 'Growth', color: '#7c3aed' },
  { id: '4', name: 'ANZ KiwiSaver High Growth Fund', provider: 'ANZ', type: 'Aggressive', color: '#0ea5e9' },
  { id: '5', name: 'ASB KiwiSaver Conservative', provider: 'ASB', type: 'Conservative', color: '#16a34a' },
  { id: '6', name: 'ASB KiwiSaver Moderate', provider: 'ASB', type: 'Balanced', color: '#14b8a6' },
  { id: '7', name: 'ASB KiwiSaver Growth', provider: 'ASB', type: 'Growth', color: '#f59e0b' },
  { id: '8', name: 'ASB KiwiSaver Aggressive Fund', provider: 'ASB', type: 'Aggressive', color: '#f97316' },
  { id: '9', name: 'BNZ KiwiSaver Conservative', provider: 'BNZ', type: 'Conservative', color: '#0f766e' },
  { id: '10', name: 'BNZ KiwiSaver Balanced', provider: 'BNZ', type: 'Balanced', color: '#0891b2' },
  { id: '11', name: 'BNZ KiwiSaver Growth', provider: 'BNZ', type: 'Growth', color: '#0284c7' },
  { id: '12', name: 'Fisher Funds Two Preservation', provider: 'Fisher Funds', type: 'Conservative', color: '#7c2d12' },
  { id: '13', name: 'Fisher Funds Growth', provider: 'Fisher Funds', type: 'Growth', color: '#c2410c' },
  { id: '14', name: 'Simplicity KiwiSaver Conservative', provider: 'Simplicity', type: 'Conservative', color: '#be185d' },
  { id: '15', name: 'Simplicity KiwiSaver Balanced', provider: 'Simplicity', type: 'Balanced', color: '#db2777' },
  { id: '16', name: 'Simplicity KiwiSaver Growth', provider: 'Simplicity', type: 'Growth', color: '#ec4899' },
  { id: '17', name: 'Westpac KiwiSaver Conservative', provider: 'Westpac', type: 'Conservative', color: '#991b1b' },
  { id: '18', name: 'Westpac KiwiSaver Balanced', provider: 'Westpac', type: 'Balanced', color: '#dc2626' },
  { id: '19', name: 'Westpac KiwiSaver Growth', provider: 'Westpac', type: 'Growth', color: '#ef4444' },
  { id: '20', name: 'Westpac KiwiSaver High Growth Fund', provider: 'Westpac', type: 'Aggressive', color: '#b91c1c' },
];

export const KIWISAVER_SCHEMES = ANALYSIS_SCHEMES;

export const SCHEME_PROVIDERS = Array.from(
  new Set(ANALYSIS_SCHEMES.map((scheme) => scheme.provider))
);

export const SCHEME_RISK_LEVELS = ['Aggressive', 'Growth', 'Balanced', 'Conservative'];
