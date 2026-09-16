/**
 * Standard medical text input for SMART ENT ENDOSCOPE
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
  useColorScheme,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '@/constants/theme';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  required?: boolean;
}

export function AppInput({
  label,
  error,
  helperText,
  containerStyle,
  required = false,
  style,
  multiline = false,
  numberOfLines = 1,
  ...rest
}: AppInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.text }]}>
            {label}
            {required && <Text style={{ color: colors.danger }}> *</Text>}
          </Text>
        </View>
      )}

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error
              ? colors.danger
              : isFocused
              ? colors.borderFocus
              : colors.border,
            color: colors.black,
            minHeight: multiline
              ? Math.max(Layout.minTouchTarget, numberOfLines * 24 + 20)
              : Layout.minTouchTarget,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        multiline={multiline}
        numberOfLines={numberOfLines}
        {...rest}
      />

      {error ? (
        <Text style={[styles.feedback, { color: colors.danger }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.feedback, { color: colors.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.base,
  },
  labelRow: {
    marginBottom: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
  input: {
    ...Typography.body,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  feedback: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
});
