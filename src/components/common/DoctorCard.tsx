/**
 * Doctor Card component for SMART ENT ENDOSCOPE
 * Supports single primary selection and multiple secondary consulting doctors.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Doctor } from '@/types';
import { StatusBadge } from './StatusBadge';

interface DoctorCardProps {
  doctor: Doctor;
  isPrimary?: boolean;
  isSecondary?: boolean;
  onSelectPrimary?: () => void;
  onToggleSecondary?: () => void;
  showMultiSelectOption?: boolean;
}

export function DoctorCard({
  doctor,
  isPrimary = false,
  isSecondary = false,
  onSelectPrimary,
  onToggleSecondary,
  showMultiSelectOption = true,
}: DoctorCardProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const isSelected = isPrimary || isSecondary;
  const isAvailable = doctor.availability === 'available';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isPrimary
            ? colors.primary
            : isSecondary
            ? colors.statusBusy
            : colors.border,
          borderWidth: isSelected ? 2 : 1.5,
        },
      ]}>
      {/* Header with Name and Availability */}
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {doctor.name}
          </Text>
          <Text style={[styles.qualification, { color: colors.primaryDark, fontWeight: '600' }]}>
            {[doctor.designation || 'ENT Specialist', doctor.medicalDegree || doctor.qualification].filter(Boolean).join(' • ')}
          </Text>
        </View>

        <StatusBadge status={doctor.availability} />
      </View>

      {/* Specialty & Center */}
      <View style={styles.infoBlock}>
        <Text style={[styles.specialty, { color: colors.primaryDark }]}>
          🏥 {doctor.subSpecialization ? `${doctor.subSpecialization} • ${doctor.specialty}` : doctor.specialty}
        </Text>
        <Text style={[styles.facility, { color: colors.textSecondary }]}>
          📍 {doctor.facility} • {doctor.experienceYears} yrs experience
        </Text>
      </View>

      {/* Selection Actions */}
      <View style={[styles.selectionRow, { borderTopColor: colors.border }]}>
        {/* Primary Doctor Selection */}
        <Pressable
          disabled={!isAvailable}
          onPress={onSelectPrimary}
          style={({ pressed }) => [
            styles.selectBtn,
            {
              backgroundColor: isPrimary
                ? colors.primary
                : colors.surfaceSecondary,
              opacity: !isAvailable ? 0.5 : pressed ? 0.8 : 1,
            },
          ]}>
          <Text
            numberOfLines={2}
            style={[
              styles.selectBtnText,
              { color: isPrimary ? '#FFFFFF' : colors.text },
            ]}>
            {isPrimary ? '✓ Primary Doctor' : 'Select as Primary'}
          </Text>
        </Pressable>

        {/* Secondary Consulting Doctor Option */}
        {showMultiSelectOption && !isPrimary && isAvailable && onToggleSecondary && (
          <Pressable
            onPress={onToggleSecondary}
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                borderColor: isSecondary ? colors.statusBusy : colors.border,
                backgroundColor: isSecondary
                  ? colors.statusBusyBg
                  : 'transparent',
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Text
              numberOfLines={2}
              style={[
                styles.secondaryBtnText,
                {
                  color: isSecondary
                    ? colors.statusBusy
                    : colors.textSecondary,
                },
              ]}>
              {isSecondary ? '✓ Added as Co-Consultant' : '+ Add Co-Consultant'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  titleCol: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    ...Typography.subtitle,
    fontSize: 17,
  },
  qualification: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  infoBlock: {
    marginBottom: Spacing.md,
  },
  specialty: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  facility: {
    ...Typography.caption,
    fontSize: 12,
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  selectBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  selectBtnText: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    includeFontPadding: false,
    textAlign: 'center',
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryBtnText: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    includeFontPadding: false,
    textAlign: 'center',
  },
});
