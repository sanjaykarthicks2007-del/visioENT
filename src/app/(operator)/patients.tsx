/**
 * Operator Patients Queue & Records Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { AppInput } from '@/components/common/AppInput';
import { AppButton } from '@/components/common/AppButton';
import { PatientCard } from '@/components/common/PatientCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useApp } from '@/context/AppContext';

type FilterTab = 'all' | 'waiting' | 'completed';

export default function OperatorPatientsScreen() {
  const { patients, consultations } = useApp();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');

  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const filteredPatients = patients.filter((p) => {
    // Search filter
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.patientId.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    const consult = consultations.find((c) => c.patientId === p.id);
    if (filter === 'waiting') {
      return (
        consult?.status === 'waiting_for_doctor' ||
        consult?.status === 'requested' ||
        consult?.status === 'doctor_selected' ||
        !consult
      );
    }
    if (filter === 'completed') {
      return consult?.status === 'completed';
    }

    return true;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="Patient Queue & Directory"
        subtitle={`${filteredPatients.length} Patients Recorded`}
        rightElement={
          <AppButton
            title="+ New"
            onPress={() => router.push('/(operator)/new-patient')}
            size="sm"
          />
        }
      />

      <View style={styles.searchSection}>
        <AppInput
          placeholder="Search by Patient Name or ID..."
          value={search}
          onChangeText={setSearch}
          containerStyle={{ marginBottom: Spacing.sm }}
        />

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'All Patients' },
            { key: 'waiting', label: 'Waiting / In Progress' },
            { key: 'completed', label: 'Completed' },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setFilter(tab.key as FilterTab)}
              style={[
                styles.filterTab,
                {
                  backgroundColor:
                    filter === tab.key
                      ? colors.primary
                      : colors.surfaceSecondary,
                },
              ]}>
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color: filter === tab.key ? '#FFFFFF' : colors.textSecondary,
                  },
                ]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const patientConsult = consultations.find(
            (c) => c.patientId === item.id
          );

          return (
            <PatientCard
              patient={item}
              consultation={patientConsult}
              onPress={() =>
                router.push({
                  pathname: '/(operator)/patient/[id]',
                  params: { id: item.id },
                })
              }
              primaryActionLabel={
                patientConsult?.status === 'active' ||
                patientConsult?.status === 'connecting' ||
                patientConsult?.status === 'accepted' ||
                patientConsult?.status === 'requested'
                  ? 'Open Room'
                  : patientConsult?.status === 'completed'
                  ? 'View Record'
                  : patientConsult?.status === 'doctor_selected'
                  ? 'Request Consult'
                  : 'Select Doctor'
              }
              onPrimaryAction={() => {
                const isRoomReady =
                  patientConsult?.status === 'active' ||
                  patientConsult?.status === 'connecting' ||
                  patientConsult?.status === 'accepted' ||
                  patientConsult?.status === 'requested' ||
                  patientConsult?.status === 'completed';

                if (isRoomReady && patientConsult) {
                  router.push({
                    pathname: '/(operator)/consultation/[id]',
                    params: { id: patientConsult.id },
                  });
                } else {
                  router.push({
                    pathname: '/(operator)/doctors',
                    params: { patientId: item.id },
                  });
                }
              }}
              secondaryActionLabel="Details"
              onSecondaryAction={() =>
                router.push({
                  pathname: '/(operator)/patient/[id]',
                  params: { id: item.id },
                })
              }
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No Patients Found"
            description="No patient records match the selected search or filter."
            actionLabel="+ Register New Patient"
            onAction={() => router.push('/(operator)/new-patient')}
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
  searchSection: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  filterTabText: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl + 20,
  },
});
