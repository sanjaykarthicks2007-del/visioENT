/**
 * Clinical Patient Card component for SMART ENT ENDOSCOPE
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
import { Patient, Consultation } from '@/types';
import { StatusBadge } from './StatusBadge';
import { AppButton } from './AppButton';

interface PatientCardProps {
  patient: Patient;
  consultation?: Consultation;
  onPress?: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  waitingTimeText?: string;
}

export function PatientCard({
  patient,
  consultation,
  onPress,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  waitingTimeText,
}: PatientCardProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // Summarize selected ENT symptoms
  const getSymptomsSummary = () => {
    const active: string[] = [];
    const c = patient.entComplaint;
    if (c.earPain) active.push('Ear Pain');
    if (c.hearingDifficulty) active.push('Hearing Diff.');
    if (c.earDischarge) active.push('Ear Discharge');
    if (c.tinnitus) active.push('Tinnitus');
    if (c.vertigo) active.push('Vertigo');
    if (c.noseBlockage) active.push('Nose Block');
    if (c.nasalDischarge) active.push('Nasal Discharge');
    if (c.epistaxis) active.push('Epistaxis');
    if (c.facialPain) active.push('Facial Pain');
    if (c.throatPain) active.push('Throat Pain');
    if (c.difficultySwallowing) active.push('Dysphagia');
    if (c.foreignBodySensation) active.push('Foreign Body');
    if (c.hoarseness) active.push('Hoarseness');
    if (c.other && c.otherDetails) active.push(c.otherDetails);

    return active.length > 0 ? active.join(' • ') : 'General ENT Evaluation';
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed && onPress ? 0.9 : 1,
        },
      ]}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={[styles.idBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.idText, { color: colors.primaryDark }]}>
            {patient.patientId}
          </Text>
        </View>

        <View style={styles.statusGroup}>
          {waitingTimeText && (
            <Text style={[styles.waitingTime, { color: colors.textMuted }]}>
              ⏱ {waitingTimeText}
            </Text>
          )}
          {consultation ? (
            <StatusBadge status={consultation.status} />
          ) : (
            <StatusBadge status={patient.entComplaint.severity} />
          )}
        </View>
      </View>

      {/* Patient Name & Demographics */}
      <View style={styles.nameRow}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {patient.name}
        </Text>
        <Text style={[styles.demographics, { color: colors.textSecondary }]}>
          {patient.age} yrs • {patient.gender}
        </Text>
      </View>

      {/* Chief ENT Complaints */}
      <View style={styles.complaintContainer}>
        <Text style={[styles.complaintLabel, { color: colors.textMuted }]}>
          CHIEF COMPLAINT:
        </Text>
        <Text style={[styles.complaintText, { color: colors.text }]} numberOfLines={2}>
          {getSymptomsSummary()} ({patient.entComplaint.duration})
        </Text>
      </View>

      {/* Facility / Location & Arrival Time */}
      <View style={styles.facilityRow}>
        <Text style={[styles.facilityText, { color: colors.textSecondary }]}>
          📍 {patient.facility}
        </Text>
        {(patient.arrivalDateTime || patient.registeredAt) && (
          <Text style={[styles.facilityText, { color: colors.textMuted }]}>
            🕒 {(() => {
              try {
                const d = new Date(patient.arrivalDateTime || patient.registeredAt);
                return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
              } catch {
                return '';
              }
            })()}
          </Text>
        )}
      </View>

      {/* Actions Row */}
      {(primaryActionLabel || secondaryActionLabel) && (
        <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
          {secondaryActionLabel && onSecondaryAction && (
            <AppButton
              title={secondaryActionLabel}
              onPress={onSecondaryAction}
              variant="outline"
              size="sm"
              style={styles.actionBtn}
            />
          )}
          {primaryActionLabel && onPrimaryAction && (
            <AppButton
              title={primaryActionLabel}
              onPress={onPrimaryAction}
              variant="primary"
              size="sm"
              style={styles.actionBtn}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  idBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    flexShrink: 0,
  },
  idText: {
    ...Typography.caption,
    fontWeight: '700',
    fontFamily: Typography.mono.fontFamily,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 0,
  },
  waitingTime: {
    ...Typography.caption,
    fontSize: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  name: {
    ...Typography.subtitle,
    fontSize: 18,
    flex: 1,
    marginRight: Spacing.sm,
  },
  demographics: {
    ...Typography.caption,
    fontWeight: '600',
  },
  complaintContainer: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  complaintLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  complaintText: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  facilityRow: {
    marginBottom: Spacing.sm,
  },
  facilityText: {
    ...Typography.caption,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    minWidth: 110,
  },
});
