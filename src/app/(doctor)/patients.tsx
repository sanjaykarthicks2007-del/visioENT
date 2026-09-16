/**
 * Doctor Patients Directory Screen
 */

import React, { useState } from 'react';
import {
  View,
  FlatList,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { AppInput } from '@/components/common/AppInput';
import { PatientCard } from '@/components/common/PatientCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useApp } from '@/context/AppContext';

export default function DoctorPatientsScreen() {
  const { patients, consultations, acceptConsultation, connectConsultation } = useApp();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.patientId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <AppHeader
        title="Patients Directory"
        subtitle={`${filteredPatients.length} Registered Patients`}
      />

      <View style={{ paddingHorizontal: Spacing.base, paddingTop: Spacing.sm }}>
        <AppInput
          placeholder="Search by Patient Name or ID..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: Spacing.base,
          paddingBottom: Spacing.xxl + 20,
        }}
        renderItem={({ item }) => {
          const patientConsult = consultations.find((c) => c.patientId === item.id);

          return (
            <PatientCard
              patient={item}
              consultation={patientConsult}
              onPress={() =>
                router.push({
                  pathname: '/(doctor)/patient/[id]',
                  params: { id: item.id },
                })
              }
              secondaryActionLabel={
                patientConsult &&
                ['requested', 'accepted', 'active', 'connecting', 'completed'].includes(
                  patientConsult.status
                )
                  ? 'Details'
                  : undefined
              }
              onSecondaryAction={
                patientConsult &&
                ['requested', 'accepted', 'active', 'connecting', 'completed'].includes(
                  patientConsult.status
                )
                  ? () =>
                      router.push({
                        pathname: '/(doctor)/patient/[id]',
                        params: { id: item.id },
                      })
                  : undefined
              }
              primaryActionLabel={
                patientConsult?.status === 'active' || patientConsult?.status === 'connecting'
                  ? 'Open Room'
                  : patientConsult?.status === 'requested'
                  ? 'Accept & Start'
                  : patientConsult?.status === 'accepted'
                  ? 'Connect Live'
                  : patientConsult?.status === 'completed'
                  ? 'View Record'
                  : 'Review Info'
              }
              onPrimaryAction={() => {
                if (patientConsult) {
                  if (patientConsult.status === 'requested') {
                    acceptConsultation(patientConsult.id, 'doc-01', 'doctor');
                    connectConsultation(patientConsult.id, 'doctor');
                    router.push({
                      pathname: '/(doctor)/consultation/[id]',
                      params: { id: patientConsult.id },
                    });
                  } else if (patientConsult.status === 'accepted') {
                    connectConsultation(patientConsult.id, 'doctor');
                    router.push({
                      pathname: '/(doctor)/consultation/[id]',
                      params: { id: patientConsult.id },
                    });
                  } else if (
                    patientConsult.status === 'active' ||
                    patientConsult.status === 'connecting' ||
                    patientConsult.status === 'completed'
                  ) {
                    router.push({
                      pathname: '/(doctor)/consultation/[id]',
                      params: { id: patientConsult.id },
                    });
                  } else {
                    router.push({
                      pathname: '/(doctor)/patient/[id]',
                      params: { id: item.id },
                    });
                  }
                } else {
                  router.push({
                    pathname: '/(doctor)/patient/[id]',
                    params: { id: item.id },
                  });
                }
              }}
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No Patients Found"
            description="No patient records match the search term."
          />
        }
      />
    </SafeAreaView>
  );
}
