export const theme = {
  colors: {
    background: '#F8FAFC',
    primary: '#3B82F6',
    text: '#1E293B',
    textSecondary: '#64748B',
    card: '#FFFFFF',
    border: '#E2E8F0',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
  },
  borderRadius: {
    s: 4,
    m: 8,
    l: 12,
    xl: 16,
  },
  typography: {
    h1: { fontSize: 24, fontWeight: 'bold' as const, color: '#1E293B' },
    h2: { fontSize: 20, fontWeight: 'bold' as const, color: '#1E293B' },
    h3: { fontSize: 18, fontWeight: '600' as const, color: '#1E293B' },
    body: { fontSize: 16, color: '#1E293B' },
    caption: { fontSize: 14, color: '#64748B' },
  }
};
