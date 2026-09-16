/**
 * Doctor Profile & Clinical Availability Status Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { AppButton } from '@/components/common/AppButton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { DoctorAvailability } from '@/types';

export default function DoctorProfileScreen() {
  const { currentUser, logout } = useAuth();
  const { doctors, updateDoctorAvailability } = useApp();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const docId =
    currentUser?.id === 'user-doc-01'
      ? 'doc-01'
      : (currentUser?.id || 'doc-01');
  const currentDoctor = doctors.find((d) => d.id === docId);
  const currentAvailability = currentDoctor?.availability || 'available';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to end your medical session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleSetAvailability = (status: DoctorAvailability) => {
    if (currentDoctor) {
      updateDoctorAvailability(currentDoctor.id, status);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader title="Doctor Profile" subtitle="Clinical Credentials & Availability" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Doctor Identity Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.avatarEmoji}>👨‍⚕️</Text>
            </View>

            <View style={styles.nameBlock}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {currentUser?.name || 'Dr. Ananya Sharma'}
              </Text>
              <Text style={[styles.qualification, { color: colors.primaryDark }]}>
                {currentUser?.qualification || 'MS (ENT), DNB'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {currentUser?.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Tele-ENT Availability Switcher */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            ONLINE CONSULTATION AVAILABILITY
          </Text>

          <Text style={[styles.statusHint, { color: colors.textSecondary }]}>
            Set your active presence for incoming PHC endoscope consultations:
          </Text>

          <View style={styles.availabilityRow}>
            {(['available', 'busy', 'offline'] as DoctorAvailability[]).map((status) => {
              const isSelected = currentAvailability === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => handleSetAvailability(status)}
                  style={[
                    styles.statusOptionBtn,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryLight
                        : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}>
                  <StatusBadge status={status} size="sm" />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Clinical Affiliation & Credentials */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            HOSPITAL & SPECIALTY CREDENTIALS
          </Text>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Specialty:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {currentUser?.specialty || 'Otology, Head & Neck Surgery'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Affiliation:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {currentUser?.facility || 'District Hospital Tele-ENT Center'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Experience:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              12 Years Professional Practice
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Contact:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {currentUser?.phone || '+91 91234 56789'}
            </Text>
          </View>
        </View>

        {/* Sign Out Action */}
        <View style={styles.signOutSection}>
          <AppButton
            title="Sign Out"
            onPress={handleSignOut}
            variant="danger"
            size="lg"
            fullWidth
          />

          <Text style={[styles.versionText, { color: colors.textMuted }]}>
            visioENT • Telehealth Portal • Team CuraXion
          </Text>
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
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  nameBlock: {
    flex: 1,
  },
  userName: {
    ...Typography.subtitle,
    fontSize: 18,
  },
  qualification: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 1,
  },
  userEmail: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    ...Typography.label,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  statusHint: {
    ...Typography.caption,
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  availabilityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusOptionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    ...Typography.caption,
    fontSize: 13,
  },
  detailValue: {
    ...Typography.bodyBold,
    fontSize: 13,
  },
  signOutSection: {
    marginTop: Spacing.base,
  },
  versionText: {
    ...Typography.caption,
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
