/**
 * Doctor Patient Review Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { AppButton } from '@/components/common/AppButton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

export default function DoctorPatientReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const {
    getPatient,
    consultations,
    acceptConsultation,
    connectConsultation,
  } = useApp();

  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const patient = id ? getPatient(id) : undefined;
  const existingConsultation = patient
    ? consultations.find((c) => c.patientId === patient.id && c.status !== 'completed')
    : undefined;

  if (!patient) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title="Patient Clinical Review" showBack />
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

  const handleAcceptAndJoin = () => {
    const docId =
      currentUser?.id === 'user-doc-01'
        ? 'doc-01'
        : (currentUser?.id || 'doc-01');
    const consultId = existingConsultation?.id;

    if (!consultId) {
      Alert.alert('No Request', 'No consultation request has been initiated by the operator yet.');
      return;
    }

    if (existingConsultation?.status === 'requested') {
      const acc = acceptConsultation(consultId, docId, 'doctor');
      if (!acc.success) {
        Alert.alert('Consultation Notice', acc.error || 'Could not accept request.');
        return;
      }
      connectConsultation(consultId, 'doctor');
    } else if (existingConsultation?.status === 'accepted') {
      connectConsultation(consultId, 'doctor');
    }

    router.push({
      pathname: '/(doctor)/consultation/[id]',
      params: { id: consultId },
    });
  };

  const isRequested = existingConsultation?.status === 'requested';
  const isAccepted = existingConsultation?.status === 'accepted';
  const isLive =
    existingConsultation?.status === 'connecting' ||
    existingConsultation?.status === 'active';
  const isCompleted = existingConsultation?.status === 'completed';
  const isPendingRequest =
    !existingConsultation ||
    existingConsultation?.status === 'waiting_for_doctor' ||
    existingConsultation?.status === 'doctor_selected';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="Clinical Intake Review"
        subtitle={`${patient.name} (${patient.patientId})`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Demographics Header Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.topRow}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Text style={[styles.idText, { color: colors.primaryDark }]}>
                {patient.patientId}
              </Text>
              <Text style={[styles.name, { color: colors.text }]}>
                {patient.name}
              </Text>
              <Text style={[styles.demographics, { color: colors.textSecondary }]}>
                {patient.age} yrs • {patient.gender} • Contact: {patient.contactNumber}
              </Text>
              <Text style={[styles.facilityText, { color: colors.textSecondary }]}>
                🏥 Registered at: {patient.facility}
              </Text>
              <Text style={[styles.demographics, { color: colors.primaryDark, fontWeight: '600', marginTop: 2 }]}>
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

            {existingConsultation ? (
              <StatusBadge status={existingConsultation.status} size="md" />
            ) : (
              <StatusBadge status={patient.entComplaint.severity} size="md" />
            )}
          </View>
        </View>

        {/* Section: ENT Complaint Breakdown */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>
            PRESENTING ENT COMPLAINTS
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
              <Text style={[styles.label, { color: colors.textSecondary }]}>Associated Symptoms:</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {patient.entComplaint.associatedSymptoms}
              </Text>
            </View>
          ) : null}

          {patient.entComplaint.additionalNotes ? (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Complaint Details:</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {patient.entComplaint.additionalNotes}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Section: Relevant History & Allergies */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>
            PAST MEDICAL & SURGICAL HISTORY
          </Text>

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Previous ENT Problems:</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {patient.relevantHistory.previousEntProblems || 'None reported'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Previous ENT Surgery:</Text>
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
              {patient.relevantHistory.relevantMedicalHistory || 'None'}
            </Text>
          </View>
        </View>

        {/* Section: Operator Clinical Notes */}
        {patient.operatorNotes ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.primary }]}>
              PHC OPERATOR OBSERVATIONS
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {patient.operatorNotes}
            </Text>
          </View>
        ) : null}

        {/* Action: Accept & Start */}
        <View style={styles.actionSection}>
          <AppButton
            title={
              isCompleted
                ? 'View Consultation Record →'
                : isLive
                ? 'Join Consultation Room →'
                : isAccepted
                ? 'Connect Live Stream →'
                : isRequested
                ? 'Accept & Start Consultation →'
                : 'Awaiting Operator Request'
            }
            onPress={handleAcceptAndJoin}
            variant="primary"
            size="lg"
            fullWidth
            disabled={isPendingRequest}
          />
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
  idText: {
    ...Typography.caption,
    fontWeight: '800',
    fontFamily: Typography.mono.fontFamily,
  },
  name: {
    ...Typography.title,
    fontSize: 20,
    marginTop: 2,
  },
  demographics: {
    ...Typography.caption,
    fontSize: 13,
    marginTop: 2,
  },
  facilityText: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 4,
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
