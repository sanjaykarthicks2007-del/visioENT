/**
 * Patient Detail View for Operator
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { AppButton } from '@/components/common/AppButton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ErrorState } from '@/components/common/ErrorState';
import { useApp } from '@/context/AppContext';

export default function OperatorPatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPatient, consultations } = useApp();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const patient = id ? getPatient(id) : undefined;
  const activeConsultation = patient
    ? consultations.find((c) => c.patientId === patient.id)
    : undefined;

  if (!patient) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title="Patient Details" showBack />
        <ErrorState
          message={`Patient with identifier '${id}' could not be located.`}
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  // Active symptoms list
  const getSymptomsList = () => {
    const list: string[] = [];
    const c = patient.entComplaint;
    if (c.earPain) list.push('Ear Pain');
    if (c.hearingDifficulty) list.push('Hearing Difficulty');
    if (c.earDischarge) list.push('Ear Discharge');
    if (c.tinnitus) list.push('Tinnitus');
    if (c.vertigo) list.push('Dizziness / Vertigo');
    if (c.noseBlockage) list.push('Nose Blockage');
    if (c.nasalDischarge) list.push('Nasal Discharge');
    if (c.epistaxis) list.push('Epistaxis (Bleeding)');
    if (c.facialPain) list.push('Facial Pain');
    if (c.throatPain) list.push('Throat Pain');
    if (c.difficultySwallowing) list.push('Difficulty Swallowing');
    if (c.foreignBodySensation) list.push('Foreign Body Sensation');
    if (c.hoarseness) list.push('Hoarseness of Voice');
    if (c.other && c.otherDetails) list.push(`Other: ${c.otherDetails}`);
    return list;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title={patient.name}
        subtitle={`${patient.patientId} • ${patient.gender}, ${patient.age} yrs`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Demographics Bar */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.topRow}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Text style={[styles.patientIdText, { color: colors.primaryDark }]}>
                {patient.patientId}
              </Text>
              <Text style={[styles.patientName, { color: colors.text }]}>
                {patient.name}
              </Text>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {patient.gender} • {patient.age} years • {patient.contactNumber}
              </Text>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                📍 {patient.facility}
              </Text>
              <Text style={[styles.metaText, { color: colors.primaryDark, fontWeight: '600', marginTop: 2 }]}>
                🕒 Arrived: {(() => {
                  try {
                    const d = new Date(patient.arrivalDateTime || patient.registeredAt);
                    return d.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });
                  } catch {
                    return patient.arrivalDateTime || patient.registeredAt;
                  }
                })()}
              </Text>
            </View>

            {activeConsultation ? (
              <StatusBadge status={activeConsultation.status} size="md" />
            ) : (
              <StatusBadge status={patient.entComplaint.severity} size="md" />
            )}
          </View>
        </View>

        {/* Section: ENT Complaint */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>
            ENT CLINICAL COMPLAINT
          </Text>

          <View style={styles.symptomsGrid}>
            {getSymptomsList().map((symptom, idx) => (
              <View
                key={idx}
                style={[styles.symptomBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.symptomText, { color: colors.primaryDark }]}>
                  {symptom}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Duration:</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {patient.entComplaint.duration}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Severity:</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {patient.entComplaint.severity.toUpperCase()}
            </Text>
          </View>

          {patient.entComplaint.associatedSymptoms ? (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Associated:</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {patient.entComplaint.associatedSymptoms}
              </Text>
            </View>
          ) : null}

          {patient.entComplaint.additionalNotes ? (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Notes:</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {patient.entComplaint.additionalNotes}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Section: Relevant History */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>
            RELEVANT MEDICAL HISTORY
          </Text>

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Previous ENT Problems:</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {patient.relevantHistory.previousEntProblems || 'None reported'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Previous Surgery:</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {patient.relevantHistory.previousEntSurgery || 'None'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Current Medication:</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {patient.relevantHistory.currentMedication || 'None'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Known Allergies:</Text>
            <Text style={[styles.value, { color: patient.relevantHistory.knownAllergies ? colors.danger : colors.text }]}>
              {patient.relevantHistory.knownAllergies || 'None reported'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>General Medical History:</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {patient.relevantHistory.relevantMedicalHistory || 'None reported'}
            </Text>
          </View>
        </View>

        {/* Section: Operator Observations */}
        {patient.operatorNotes ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.primary }]}>
              OPERATOR OBSERVATIONS
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {patient.operatorNotes}
            </Text>
          </View>
        ) : null}

        {/* Clinical Action */}
        <View style={styles.actionSection}>
          {activeConsultation &&
          (activeConsultation.status === 'requested' ||
            activeConsultation.status === 'accepted' ||
            activeConsultation.status === 'connecting' ||
            activeConsultation.status === 'active' ||
            activeConsultation.status === 'completed') ? (
            <AppButton
              title={
                activeConsultation.status === 'completed'
                  ? 'View Consultation Record →'
                  : 'Open Consultation Room →'
              }
              onPress={() =>
                router.push({
                  pathname: '/(operator)/consultation/[id]',
                  params: { id: activeConsultation.id },
                })
              }
              variant="primary"
              size="lg"
              fullWidth
            />
          ) : (
            <AppButton
              title={
                activeConsultation?.status === 'doctor_selected'
                  ? 'Request Tele-Consultation →'
                  : 'Select ENT Doctor & Connect →'
              }
              onPress={() =>
                router.push({
                  pathname: '/(operator)/doctors',
                  params: { patientId: patient.id },
                })
              }
              variant="primary"
              size="lg"
              fullWidth
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl + 20,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientIdText: {
    ...Typography.caption,
    fontWeight: '800',
    fontFamily: Typography.mono.fontFamily,
  },
  patientName: {
    ...Typography.title,
    fontSize: 20,
    marginTop: 2,
  },
  metaText: {
    ...Typography.caption,
    fontSize: 13,
    marginTop: 2,
  },
  sectionHeading: {
    ...Typography.label,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  symptomBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  symptomText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  detailRow: {
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    ...Typography.body,
    fontSize: 14,
    marginTop: 2,
  },
  actionSection: {
    marginTop: Spacing.sm,
  },
});
