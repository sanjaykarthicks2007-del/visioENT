/**
 * Operator Consultation History Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { AppButton } from '@/components/common/AppButton';
import { useApp } from '@/context/AppContext';

export default function OperatorHistoryScreen() {
  const { consultations, patients, doctors } = useApp();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="Consultation History"
        subtitle="Log of all tele-ENT sessions at this station"
      />

      <FlatList
        data={consultations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const patient = patients.find((p) => p.id === item.patientId);
          const doctor = doctors.find((d) => d.id === item.primaryDoctorId);
          const dateStr = item.completedAt || item.createdAt;
          const formattedDate = new Date(dateStr).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <View
              style={[
                styles.historyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.consultNumber, { color: colors.primaryDark }]}>
                    {item.consultationNumber}
                  </Text>
                  <Text style={[styles.dateText, { color: colors.textMuted }]}>
                    {formattedDate}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              <View style={styles.bodySection}>
                <Text style={[styles.patientName, { color: colors.text }]}>
                  {patient?.name || 'Patient Record'} ({patient?.patientId || 'N/A'})
                </Text>
                <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
                  Doctor: {doctor?.name || 'Assigned Specialist'} ({doctor?.specialty})
                </Text>
                {item.provisionalDiagnosis ? (
                  <Text style={[styles.diagnosisText, { color: colors.primaryDark }]}>
                    Dx: {item.provisionalDiagnosis}
                  </Text>
                ) : null}
              </View>

              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <AppButton
                  title={item.status === 'completed' ? 'View Summary' : 'Open Session'}
                  onPress={() => {
                    if (item.status === 'completed') {
                      router.push({
                        pathname: '/(operator)/patient/[id]',
                        params: { id: patient?.id || '' },
                      });
                    } else {
                      router.push({
                        pathname: '/(operator)/consultation/[id]',
                        params: { id: item.id },
                      });
                    }
                  }}
                  variant="outline"
                  size="sm"
                  style={{ alignSelf: 'flex-end' }}
                />
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No Consultation Records"
            description="No recorded consultations have taken place at this facility yet."
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
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl + 20,
  },
  historyCard: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  consultNumber: {
    ...Typography.caption,
    fontWeight: '800',
    fontFamily: Typography.mono.fontFamily,
  },
  dateText: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
  bodySection: {
    marginBottom: Spacing.sm,
  },
  patientName: {
    ...Typography.subtitle,
    fontSize: 17,
  },
  detailsText: {
    ...Typography.body,
    fontSize: 13,
    marginTop: 2,
  },
  diagnosisText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
