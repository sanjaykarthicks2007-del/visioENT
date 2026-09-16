/**
 * Clinical status badge pill for SMART ENT ENDOSCOPE
 */

import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { ConsultationStatus, DoctorAvailability } from '@/types';

type BadgeType =
  | ConsultationStatus
  | DoctorAvailability
  | 'mild'
  | 'moderate'
  | 'severe'
  | 'acute';

interface StatusBadgeProps {
  status: BadgeType;
  labelOverride?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, labelOverride, size = 'sm' }: StatusBadgeProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const getBadgeStyle = () => {
    switch (status) {
      // Doctor Availability
      case 'available':
        return {
          bg: colors.statusAvailableBg,
          text: colors.statusAvailable,
          label: 'Available',
          dot: colors.statusAvailable,
        };
      case 'busy':
        return {
          bg: colors.statusBusyBg,
          text: colors.statusBusy,
          label: 'Busy',
          dot: colors.statusBusy,
        };
      case 'offline':
        return {
          bg: colors.statusOfflineBg,
          text: colors.statusOffline,
          label: 'Offline',
          dot: colors.statusOffline,
        };

      // Consultation Statuses
      case 'waiting_for_doctor':
        return {
          bg: colors.statusBusyBg,
          text: colors.statusBusy,
          label: 'Waiting for Doctor',
          dot: colors.statusBusy,
        };
      case 'doctor_selected':
        return {
          bg: colors.primaryLight,
          text: colors.primaryDark,
          label: 'Doctor Selected',
          dot: colors.primary,
        };
      case 'requested':
        return {
          bg: colors.statusBusyBg,
          text: colors.statusBusy,
          label: 'Requested',
          dot: colors.statusBusy,
        };
      case 'accepted':
        return {
          bg: colors.primaryLight,
          text: colors.primaryDark,
          label: 'Accepted',
          dot: colors.primary,
        };
      case 'connecting':
        return {
          bg: colors.primaryLight,
          text: colors.primaryDark,
          label: 'Connecting',
          dot: colors.primary,
        };
      case 'active':
        return {
          bg: colors.statusAvailableBg,
          text: colors.statusAvailable,
          label: 'Live / Active',
          dot: colors.statusAvailable,
        };
      case 'completed':
        return {
          bg: colors.statusCompletedBg,
          text: colors.statusCompleted,
          label: 'Completed',
          dot: colors.statusCompleted,
        };

      // Severity indicators
      case 'mild':
        return {
          bg: colors.surfaceSecondary,
          text: colors.textSecondary,
          label: 'Mild',
          dot: colors.textMuted,
        };
      case 'moderate':
        return {
          bg: colors.statusBusyBg,
          text: colors.statusBusy,
          label: 'Moderate',
          dot: colors.statusBusy,
        };
      case 'severe':
      case 'acute':
        return {
          bg: colors.dangerBg,
          text: colors.danger,
          label: status.toUpperCase(),
          dot: colors.danger,
        };

      default:
        return {
          bg: colors.surfaceSecondary,
          text: colors.text,
          label: status,
          dot: colors.textSecondary,
        };
    }
  };

  const badge = getBadgeStyle();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: badge.bg,
          paddingHorizontal: isSm ? Spacing.sm : Spacing.md,
          paddingVertical: isSm ? 4 : 6,
        },
      ]}>
      <View style={[styles.dot, { backgroundColor: badge.dot }]} />
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          {
            color: badge.text,
            fontSize: isSm ? 11 : 12,
            lineHeight: isSm ? 15 : 17,
          },
        ]}>
        {labelOverride || badge.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    flexShrink: 0,
  },
  text: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
});
