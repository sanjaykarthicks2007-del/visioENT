/**
 * Operator Home Dashboard for SMART ENT ENDOSCOPE
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
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { AppButton } from '@/components/common/AppButton';
import { PatientCard } from '@/components/common/PatientCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

export default function OperatorHomeScreen() {
  const { currentUser } = useAuth();
  const { patients, consultations } = useApp();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // Identify active or pending consultations
  const activeOrWaitingConsultation = consultations.find(
    (c) => c.status !== 'completed'
  );

  const activePatient = activeOrWaitingConsultation
    ? patients.find((p) => p.id === activeOrWaitingConsultation.patientId)
    : undefined;

  // Counts
  const waitingCount = consultations.filter(
    (c) => c.status === 'waiting_for_doctor' || c.status === 'requested'
  ).length;

  const todayCount = patients.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="visioENT"
        subtitle={`Operator: ${currentUser?.name || 'PHC Operator'}`}
        facilityBadge={currentUser?.facility || 'Station 01'}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Consultation Banner (if any) */}
        {activeOrWaitingConsultation && activePatient && (
          <View
            style={[
              styles.activeBanner,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
              },
            ]}>
            <View style={styles.bannerHeader}>
              <View style={[styles.bannerBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.bannerBadgeText, { color: colors.primaryDark }]}>
                  CURRENT SESSION
                </Text>
              </View>
              <StatusBadge status={activeOrWaitingConsultation.status} />
            </View>

            <Text style={[styles.bannerPatientName, { color: colors.text }]}>
              {activePatient.name} ({activePatient.patientId})
            </Text>
            <Text style={[styles.bannerComplaint, { color: colors.textSecondary }]}>
              {activePatient.entComplaint.duration} • {activePatient.entComplaint.severity.toUpperCase()}
            </Text>

            <AppButton
              title={
                activeOrWaitingConsultation.status === 'doctor_selected'
                  ? 'Request Consultation →'
                  : activeOrWaitingConsultation.status === 'waiting_for_doctor'
                  ? 'Select ENT Doctor →'
                  : 'Open Consultation Room →'
              }
              onPress={() => {
                if (
                  activeOrWaitingConsultation.status === 'waiting_for_doctor' ||
                  activeOrWaitingConsultation.status === 'doctor_selected'
                ) {
                  router.push({
                    pathname: '/(operator)/doctors',
                    params: { patientId: activePatient.id },
                  });
                } else {
                  router.push({
                    pathname: '/(operator)/consultation/[id]',
                    params: { id: activeOrWaitingConsultation.id },
                  });
                }
              }}
              variant="primary"
              size="sm"
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        )}

        {/* Clinical Overview Stat Pills */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {waitingCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Waiting for Doctor
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <Text style={[styles.statNumber, { color: colors.statusCompleted }]}>
              {todayCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Total Intake Today
            </Text>
          </View>
        </View>

        {/* Primary & Secondary Clinical Actions */}
        <View style={styles.actionsSection}>
          <AppButton
            title="+ Register New Patient"
            onPress={() => router.push('/(operator)/new-patient')}
            variant="primary"
            size="lg"
            fullWidth
          />

          <AppButton
            title="View Patient Queue"
            onPress={() => router.push('/(operator)/patients')}
            variant="secondary"
            size="md"
            fullWidth
            style={{ marginTop: Spacing.sm }}
          />
        </View>

        {/* Today's Registered Patients */}
        <SectionHeader
          title="Today's Registered Patients"
          subtitle="Recent patient examinations at this facility"
          actionText="View All"
          onAction={() => router.push('/(operator)/patients')}
        />

        {patients.slice(0, 3).map((patient) => {
          const patientConsultation = consultations.find(
            (c) => c.patientId === patient.id
          );

          return (
            <PatientCard
              key={patient.id}
              patient={patient}
              consultation={patientConsultation}
              onPress={() =>
                router.push({
                  pathname: '/(operator)/patient/[id]',
                  params: { id: patient.id },
                })
              }
              primaryActionLabel={
                patientConsultation?.status === 'active' ||
                patientConsultation?.status === 'connecting' ||
                patientConsultation?.status === 'accepted' ||
                patientConsultation?.status === 'requested'
                  ? 'Open Room'
                  : patientConsultation?.status === 'completed'
                  ? 'View Record'
                  : patientConsultation?.status === 'doctor_selected'
                  ? 'Request Consult'
                  : 'Select Doctor'
              }
              onPrimaryAction={() => {
                const isRoomReady =
                  patientConsultation?.status === 'active' ||
                  patientConsultation?.status === 'connecting' ||
                  patientConsultation?.status === 'accepted' ||
                  patientConsultation?.status === 'requested' ||
                  patientConsultation?.status === 'completed';

                if (isRoomReady && patientConsultation) {
                  router.push({
                    pathname: '/(operator)/consultation/[id]',
                    params: { id: patientConsultation.id },
                  });
                } else {
                  router.push({
                    pathname: '/(operator)/doctors',
                    params: { patientId: patient.id },
                  });
                }
              }}
              secondaryActionLabel="Details"
              onSecondaryAction={() =>
                router.push({
                  pathname: '/(operator)/patient/[id]',
                  params: { id: patient.id },
                })
              }
            />
          );
        })}
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
    paddingBottom: Spacing.xxl,
  },
  activeBanner: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  bannerBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  bannerBadgeText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerPatientName: {
    ...Typography.subtitle,
    fontSize: 18,
  },
  bannerComplaint: {
    ...Typography.body,
    fontSize: 13,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  statCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 82,
  },
  statNumber: {
    ...Typography.title,
    fontSize: 26,
    lineHeight: 30,
  },
  statLabel: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    textAlign: 'center',
    includeFontPadding: false,
  },
  actionsSection: {
    marginVertical: Spacing.sm,
  },
});
