/**
 * Accessible clinical button component for SMART ENT ENDOSCOPE
 */

import React from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  useColorScheme,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}: AppButtonProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    let backgroundColor: string = colors.primary;
    let borderColor: string = colors.primary;
    let borderWidth = 0;

    switch (variant) {
      case 'primary':
        backgroundColor = colors.primary;
        borderColor = colors.primary;
        break;
      case 'secondary':
      case 'outline':
        backgroundColor = colors.surface;
        borderColor = colors.primary;
        borderWidth = 1.5;
        break;
      case 'danger':
        backgroundColor = colors.danger;
        borderColor = colors.danger;
        break;
      case 'ghost':
        backgroundColor = 'transparent';
        borderColor = 'transparent';
        break;
    }

    let paddingVertical: number = Spacing.md;
    let paddingHorizontal: number = Spacing.base;
    let minHeight: number = Layout.minTouchTarget;

    if (size === 'sm') {
      paddingVertical = Spacing.sm;
      paddingHorizontal = Spacing.md;
      minHeight = 38;
    } else if (size === 'lg') {
      paddingVertical = Spacing.base;
      paddingHorizontal = Spacing.xl;
      minHeight = 54;
    }

    return {
      backgroundColor,
      borderColor,
      borderWidth,
      paddingVertical,
      paddingHorizontal,
      minHeight,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      alignSelf: fullWidth ? 'stretch' : 'auto',
    };
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
      case 'outline':
      case 'ghost':
        return colors.primary;
      default:
        return '#FFFFFF';
    }
  };

  const textFontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 15;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [getContainerStyle(pressed), style]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
          style={styles.spinner}
        />
      ) : (
        <>
          {icon && <View style={{ marginRight: Spacing.sm }}>{icon}</View>}
          <Text
            style={[
              Typography.bodyBold,
              {
                color: getTextColor(),
                fontSize: textFontSize,
              },
              textStyle,
            ]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  spinner: {
    marginRight: Spacing.xs,
  },
});
