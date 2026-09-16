/**
 * Doctor Dashboard / Live Waiting Room for SMART ENT ENDOSCOPE
 * Focuses exclusively on the clinical waiting room queue.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { PatientCard } from '@/components/common/PatientCard';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AppButton } from '@/components/common/AppButton';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

export default function DoctorDashboardScreen() {
  const { currentUser } = useAuth();
  const {
    consultations,
    patients,
    acceptConsultation,
    connectConsultation,
  } = useApp();
  const router = useRouter();

  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // Current doctor ID
  const doctorId =
    currentUser?.id === 'user-doc-01'
      ? 'doc-01'
      : (currentUser?.id || 'doc-01');

  const isAssignedDoctor = (primaryDocId?: string, assignedIds: string[] = []) => {
    if (primaryDocId === doctorId || assignedIds.includes(doctorId)) {
      return true;
    }
    if (
      currentUser?.email?.toLowerCase() === 'doctor.sharma@curaxion.health' &&
      (primaryDocId === 'doc-01' || assignedIds.includes('doc-01'))
    ) {
      return true;
    }
    return false;
  };

  // Active consultation (if any in progress)
  const activeConsultation = consultations.find(
    (c) => c.status === 'active' && isAssignedDoctor(c.primaryDoctorId, c.assignedDoctorIds)
  );

  const activePatient = activeConsultation
    ? patients.find((p) => p.id === activeConsultation.patientId)
    : undefined;

  // Waiting consultations (requests or accepted)
  const waitingConsultations = consultations.filter(
    (c) =>
      (c.status === 'requested' || c.status === 'accepted') &&
      isAssignedDoctor(c.primaryDoctorId, c.assignedDoctorIds)
  );

  const handleAcceptAndStart = (consultationId: string) => {
    const target = consultations.find((c) => c.id === consultationId);
    if (!target) return;

    if (target.status === 'requested') {
      // Strict Transition 3: requested -> accepted
      const accResult = acceptConsultation(consultationId, doctorId, 'doctor');
      if (!accResult.success) {
        Alert.alert('Consultation Notice', accResult.error || 'Could not accept consultation.');
        return;
      }
    } else if (target.status === 'accepted') {
      // Strict Transition 4: accepted -> connecting
      connectConsultation(consultationId, 'doctor');
    }

    router.push({
      pathname: '/(doctor)/consultation/[id]',
      params: { id: consultationId },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="Tele-ENT Waiting Room"
        subtitle={`${currentUser?.name || 'ENT Doctor'} • ${currentUser?.specialty || 'ENT Specialist'}`}
        facilityBadge="ONLINE CLINIC"
      />

      {/* Active Consultation Prompt (if any session is live) */}
      {activeConsultation && activePatient && (
        <View style={styles.activeBannerWrapper}>
          <View
            style={[
              styles.activeBanner,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
              },
            ]}>
            <View style={styles.bannerTop}>
              <View style={[styles.bannerBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.bannerBadgeText, { color: colors.primaryDark }]}>
                  SESSION IN PROGRESS
                </Text>
              </View>
              <StatusBadge status="active" />
            </View>

            <Text style={[styles.bannerPatientName, { color: colors.text }]}>
              {activePatient.name} ({activePatient.patientId})
            </Text>
            <Text style={[styles.bannerMeta, { color: colors.textSecondary }]}>
              📍 {activePatient.facility} • {activePatient.gender}, {activePatient.age}y
            </Text>

            <AppButton
              title="Resume Consultation Room →"
              onPress={() =>
                router.push({
                  pathname: '/(doctor)/consultation/[id]',
                  params: { id: activeConsultation.id },
                })
              }
              variant="primary"
              size="sm"
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </View>
      )}

      {/* Waiting Room Queue Header */}
      <View style={styles.queueHeader}>
        <View>
          <Text style={[styles.queueTitle, { color: colors.text }]}>
            Incoming Consultations Queue
          </Text>
          <Text style={[styles.queueSub, { color: colors.textSecondary }]}>
            {waitingConsultations.length} Patient{waitingConsultations.length === 1 ? '' : 's'} waiting for examination
          </Text>
        </View>

        <View style={[styles.queueCountPill, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.queueCountText, { color: colors.primaryDark }]}>
            {waitingConsultations.length} WAITING
          </Text>
        </View>
      </View>

      <FlatList
        data={waitingConsultations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const patient = patients.find((p) => p.id === item.patientId);
          if (!patient) return null;

          return (
            <PatientCard
              patient={patient}
              consultation={item}
              waitingTimeText="5m ago"
              onPress={() =>
                router.push({
                  pathname: '/(doctor)/patient/[id]',
                  params: { id: patient.id },
                })
              }
              secondaryActionLabel="Review Info"
              onSecondaryAction={() =>
                router.push({
                  pathname: '/(doctor)/patient/[id]',
                  params: { id: patient.id },
                })
              }
              primaryActionLabel={item.status === 'accepted' ? 'Connect Live' : 'Accept & Start'}
              onPrimaryAction={() => handleAcceptAndStart(item.id)}
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="☕"
            title="Waiting Room Empty"
            description="There are currently no patients waiting in your tele-ENT queue. New intakes will appear here in real time."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  activeBannerWrapper: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  activeBanner: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  bannerTop: {
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
  bannerMeta: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  queueTitle: {
    ...Typography.subtitle,
    fontSize: 17,
  },
  queueSub: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  queueCountPill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  queueCountText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '800',
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl + 20,
  },
});
