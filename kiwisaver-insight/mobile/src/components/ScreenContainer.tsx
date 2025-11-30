import React from 'react';
import { View, StyleSheet, SafeAreaView, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export const ScreenContainer = ({ children, style }: Props) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.m,
  },
});
