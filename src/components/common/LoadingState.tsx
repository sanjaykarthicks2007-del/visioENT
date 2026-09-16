/**
 * Loading state and Error state components
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AppButton } from './AppButton';

export function LoadingState({ message = 'Loading clinical data...' }: { message?: string }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

export function ErrorState({
  message = 'An unexpected error occurred.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: BorderRadius.lg,
          padding: Spacing.xl,
          margin: Spacing.base,
        },
      ]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.title, { color: colors.text }]}>Clinical System Notice</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry && (
        <AppButton
          title="Retry"
          onPress={onRetry}
          variant="primary"
          size="sm"
          style={{ marginTop: Spacing.base }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.subtitle,
    fontSize: 16,
    marginBottom: Spacing.xs,
  },
  message: {
    ...Typography.body,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
