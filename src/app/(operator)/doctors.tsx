/**
 * Doctor Directory & Tele-Consultation Selection Screen
 * Supports single primary doctor and multiple secondary consulting specialists.
 */

import React, { useState } from 'react';
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
import { DoctorCard } from '@/components/common/DoctorCard';
import { useApp } from '@/context/AppContext';

export default function OperatorDoctorsScreen() {
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const {
    doctors,
    patients,
    consultations,
    createConsultation,
    selectDoctorForConsultation,
    requestConsultation,
  } = useApp();
  const router = useRouter();

  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // Default patient: matched patientId or first patient
  const selectedPatient = patientId
    ? patients.find((p) => p.id === patientId || p.patientId === patientId)
    : patients[0];

  const currentConsultation = selectedPatient
    ? consultations.find((c) => c.patientId === selectedPatient.id && c.status !== 'completed')
    : undefined;

  const [prevPatientId, setPrevPatientId] = useState<string | undefined>(
    selectedPatient?.id
  );
  const [primaryDoctorId, setPrimaryDoctorId] = useState<string>(
    currentConsultation?.primaryDoctorId || ''
  );
  const [secondaryDoctorIds, setSecondaryDoctorIds] = useState<string[]>(
    currentConsultation?.assignedDoctorIds.filter(
      (id) => id !== currentConsultation.primaryDoctorId
    ) || []
  );

  if (selectedPatient?.id !== prevPatientId) {
    setPrevPatientId(selectedPatient?.id);
    setPrimaryDoctorId(currentConsultation?.primaryDoctorId || '');
    setSecondaryDoctorIds(
      currentConsultation?.assignedDoctorIds.filter(
        (id) => id !== currentConsultation?.primaryDoctorId
      ) || []
    );
  }

  const handleSelectPrimary = (doctorId: string) => {
    if (!selectedPatient) {
      Alert.alert('Patient Required', 'Please select or register a patient first.');
      return;
    }

    const consult = currentConsultation || createConsultation(selectedPatient.id);
    const updatedSecondary = secondaryDoctorIds.filter((id) => id !== doctorId);
    const assigned = [doctorId, ...updatedSecondary];

    setPrimaryDoctorId(doctorId);
    setSecondaryDoctorIds(updatedSecondary);

    // Transition 1: waiting_for_doctor -> doctor_selected (or in-state update if already doctor_selected)
    const result = selectDoctorForConsultation(
      consult.id,
      doctorId,
      assigned,
      'operator'
    );

    if (!result.success) {
      Alert.alert('Selection Error', result.error || 'Failed to select doctor.');
    }
  };

  const handleToggleSecondary = (doctorId: string) => {
    if (doctorId === primaryDoctorId) return;

    const newSecondary = secondaryDoctorIds.includes(doctorId)
      ? secondaryDoctorIds.filter((id) => id !== doctorId)
      : [...secondaryDoctorIds, doctorId];

    setSecondaryDoctorIds(newSecondary);

    if (primaryDoctorId && selectedPatient) {
      const consult = currentConsultation || createConsultation(selectedPatient.id);
      if (consult.status === 'doctor_selected') {
        const assigned = [primaryDoctorId, ...newSecondary];
        selectDoctorForConsultation(consult.id, primaryDoctorId, assigned, 'operator');
      }
    }
  };

  const handleRequestConsultation = () => {
    if (!selectedPatient) {
      Alert.alert('Patient Required', 'Please select or register a patient first.');
      return;
    }

    if (!primaryDoctorId) {
      Alert.alert('Doctor Required', 'Please select a primary ENT doctor.');
      return;
    }

    const consult = currentConsultation || createConsultation(selectedPatient.id);
    const assigned = [primaryDoctorId, ...secondaryDoctorIds];

    // Ensure doctor is selected and status is doctor_selected
    if (consult.status === 'waiting_for_doctor') {
      const selResult = selectDoctorForConsultation(
        consult.id,
        primaryDoctorId,
        assigned,
        'operator'
      );
      if (!selResult.success) {
        Alert.alert('Transition Error', selResult.error || 'Failed to select doctor.');
        return;
      }
    } else if (consult.status === 'doctor_selected') {
      selectDoctorForConsultation(
        consult.id,
        primaryDoctorId,
        assigned,
        'operator'
      );
    }

    // Transition 2: doctor_selected -> requested
    const reqResult = requestConsultation(consult.id, 'operator');
    if (!reqResult.success) {
      Alert.alert('Transition Error', reqResult.error || 'Failed to request consultation.');
      return;
    }

    router.push({
      pathname: '/(operator)/consultation/[id]',
      params: { id: consult.id },
    });
  };

  const primaryDoctor = doctors.find((d) => d.id === primaryDoctorId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="ENT Doctor Selection"
        subtitle="Connect Patient with Remote Specialist"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Selected Patient Banner */}
        {selectedPatient && (
          <View
            style={[
              styles.patientBanner,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <Text style={[styles.bannerLabel, { color: colors.primaryDark }]}>
              PATIENT FOR CONSULTATION:
            </Text>
            <Text style={[styles.patientName, { color: colors.text }]}>
              {selectedPatient.name} ({selectedPatient.patientId})
            </Text>
            <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>
              {selectedPatient.gender}, {selectedPatient.age} yrs • Chief Complaint: {selectedPatient.entComplaint.duration}
            </Text>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.infoBanner}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            ℹ️ Choose an available ENT doctor. You may also add co-consultants for multi-specialty opinion if required by clinical triage.
          </Text>
        </View>

        {/* Doctor List */}
        <View style={styles.doctorsList}>
          {doctors.map((doctor) => {
            const isPrimary = doctor.id === primaryDoctorId;
            const isSecondary = secondaryDoctorIds.includes(doctor.id);

            return (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                isPrimary={isPrimary}
                isSecondary={isSecondary}
                onSelectPrimary={() => handleSelectPrimary(doctor.id)}
                onToggleSecondary={() => handleToggleSecondary(doctor.id)}
              />
            );
          })}
        </View>

        {/* Action Bar */}
        <View style={styles.bottomSection}>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryText, { color: colors.text }]}>
              Selected: <Text style={{ fontWeight: '700' }}>{primaryDoctor?.name || 'None'}</Text>
              {secondaryDoctorIds.length > 0 && ` (+ ${secondaryDoctorIds.length} Co-Consultants)`}
            </Text>
          </View>

          <AppButton
            title="Request Tele-Consultation →"
            onPress={handleRequestConsultation}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!primaryDoctor || primaryDoctor.availability !== 'available'}
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
  patientBanner: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  bannerLabel: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  patientName: {
    ...Typography.subtitle,
    fontSize: 17,
    marginTop: 2,
  },
  patientMeta: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  infoBanner: {
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.xs,
  },
  infoText: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 18,
  },
  doctorsList: {
    marginBottom: Spacing.base,
  },
  bottomSection: {
    marginTop: Spacing.sm,
  },
  summaryBox: {
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  summaryText: {
    ...Typography.body,
    fontSize: 13,
  },
});
