/**
 * Medical app header component with back navigation and facility context
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Layout } from '@/constants/theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  facilityBadge?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  facilityBadge,
  showBack = false,
  onBack,
  rightElement,
}: AppHeaderProps) {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}>
      <View style={styles.leftRow}>
        {showBack && (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
          </Pressable>
        )}

        <View style={styles.titleColumn}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightContainer}>
        {facilityBadge && (
          <View
            style={[
              styles.facilityBadge,
              { backgroundColor: colors.primaryLight },
            ]}>
            <Text style={[styles.facilityText, { color: colors.primaryDark }]}>
              {facilityBadge}
            </Text>
          </View>
        )}
        {rightElement}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: Layout.minTouchTarget + 10,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  backButton: {
    minWidth: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  backArrow: {
    fontSize: 24,
    fontWeight: '700',
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    ...Typography.subtitle,
    fontSize: 18,
    lineHeight: 22,
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facilityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  facilityText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
});
