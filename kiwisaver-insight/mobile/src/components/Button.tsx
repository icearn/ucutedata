import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
};

export const Button = ({ title, onPress, variant = 'primary', loading, disabled }: Props) => {
  const getBackgroundColor = () => {
    if (disabled) return theme.colors.textSecondary;
    if (variant === 'primary') return theme.colors.primary;
    if (variant === 'secondary') return theme.colors.textSecondary;
    return 'transparent';
  };

  const getTextColor = () => {
    if (variant === 'outline') return theme.colors.primary;
    return '#FFFFFF';
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && styles.outline,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.l,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.s,
  },
  outline: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
