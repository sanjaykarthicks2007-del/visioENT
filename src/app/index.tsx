/**
 * Root Router / Redirector for SMART ENT ENDOSCOPE
 * Directs users to auth or their respective role workspace.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

export default function IndexScreen() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    if (isLoading) return;

    if (!currentUser) {
      router.replace('/(auth)/login');
    } else if (currentUser.role === 'operator') {
      router.replace('/(operator)');
    } else if (currentUser.role === 'doctor') {
      router.replace('/(doctor)');
    }
  }, [currentUser, isLoading, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});