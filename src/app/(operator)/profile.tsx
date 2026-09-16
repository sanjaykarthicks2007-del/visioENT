/**
 * Operator Profile & Device Station Configuration
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
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { AppButton } from '@/components/common/AppButton';
import { useAuth } from '@/context/AuthContext';

export default function OperatorProfileScreen() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to end your operator session?', [
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader title="Operator Profile" subtitle="Account & Station Hardware" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Identity Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <View style={styles.avatarRow}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: colors.primaryLight },
              ]}>
              <Text style={[styles.avatarText, { color: colors.primaryDark }]}>
                🏥
              </Text>
            </View>
            <View style={styles.nameBlock}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {currentUser?.name || 'PHC Operator'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {currentUser?.email}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: colors.primaryLight },
                ]}>
                <Text
                  style={[
                    styles.roleBadgeText,
                    { color: colors.primaryDark },
                  ]}>
                  ROLE: PHC OPERATOR
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Facility & Hardware Details */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            HEALTH CENTER FACILITY
          </Text>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Facility:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {currentUser?.facility || 'Primary Health Centre'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Contact Number:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {currentUser?.phone || '+91 98765 43210'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Workstation:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              Station 01 (Endoscope Dedicated)
            </Text>
          </View>
        </View>

        {/* Endoscope Hardware Status */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            ENDOSCOPE HARDWARE STATUS
          </Text>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Camera Sensor:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              OmniVision OV5640 5MP
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              MCU Host:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              ESP32-S3 Dual-Core Xtensa
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Default Gateway:
            </Text>
            <Text
              style={[
                styles.detailValue,
                { color: colors.text, fontFamily: Typography.mono.fontFamily },
              ]}>
              192.168.4.1 (SoftAP)
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Cleartext Traffic:
            </Text>
            <Text style={[styles.detailValue, { color: colors.statusAvailable }]}>
              Enabled (Android)
            </Text>
          </View>
        </View>

        {/* Clinical Staff Administration */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            CLINICAL STAFF ADMINISTRATION
          </Text>

          <Text style={[styles.adminDesc, { color: colors.textSecondary }]}>
            Provision authorized PHC Operator or ENT Doctor credentials.
          </Text>

          <AppButton
            title="+ Register New Clinical Staff"
            onPress={() => router.push('/(operator)/register-clinical-user' as any)}
            variant="secondary"
            size="md"
            fullWidth
          />
        </View>

        {/* App Info & Sign Out */}
        <View style={styles.signOutSection}>
          <AppButton
            title="Sign Out"
            onPress={handleSignOut}
            variant="danger"
            size="lg"
            fullWidth
          />

          <Text style={[styles.versionText, { color: colors.textMuted }]}>
            visioENT • v1.0.0 • CuraXion
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
  avatarText: {
    fontSize: 26,
  },
  nameBlock: {
    flex: 1,
  },
  userName: {
    ...Typography.subtitle,
    fontSize: 18,
  },
  userEmail: {
    ...Typography.caption,
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  roleBadgeText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    ...Typography.label,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  adminDesc: {
    ...Typography.body,
    fontSize: 13,
    marginBottom: Spacing.md,
    lineHeight: 18,
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
