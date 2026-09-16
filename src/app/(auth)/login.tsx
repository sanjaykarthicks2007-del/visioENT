/**
 * Clean Clinical Login Screen for SMART ENT ENDOSCOPE (CuraXion)
 */

import React, { useState } from 'react';
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
import { AppButton } from '@/components/common/AppButton';
import { AppInput } from '@/components/common/AppInput';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('operator@curaxion.health');
  const [password, setPassword] = useState('Password@123');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const handleSignIn = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your clinical email.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      // Role is derived strictly from authenticated user profile
      if (result.role === 'doctor') {
        router.replace('/(doctor)');
      } else {
        router.replace('/(operator)');
      }
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Password Reset',
      'For security, password recovery instructions must be requested from your PHC / Hospital System Administrator.',
      [{ text: 'OK' }]
    );
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setErrorMessage('');
  };

  const handleRegisterAsClinicalStaff = () => {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      Alert.alert(
        'Offline Notice',
        'Internet connection is required to create a new clinical staff account.'
      );
      return;
    }
    router.push('/(auth)/register' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Branding & Medical Header */}
        <View style={styles.brandHeader}>
          <View style={[styles.logoBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.logoIcon, { color: colors.primaryDark }]}>🩺</Text>
          </View>
          <Text style={[styles.appTitle, { color: colors.text }]}>visioENT</Text>
          <Text style={[styles.appSub, { color: colors.textSecondary }]}>
            Portable Endoscopy & Tele-Consultation
          </Text>
          <Text style={[styles.teamLabel, { color: colors.primaryDark }]}>
            CURAXION HEALTHCARE
          </Text>
        </View>

        {/* Clinical Login Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Clinical Sign In
          </Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            Access patient records, endoscope feed & consultations
          </Text>

          {errorMessage ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerBg }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {/* Form Fields */}
          <AppInput
            label="Clinical Email / ID"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrorMessage('');
            }}
            placeholder="e.g. operator@curaxion.health"
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />

          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter secure password"
            secureTextEntry
            required
          />

          {/* Forgot Password Action */}
          <Pressable
            onPress={handleForgotPassword}
            style={styles.forgotBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.forgotText, { color: colors.primary }]}>
              Forgot password?
            </Text>
          </Pressable>

          {/* Sign In Primary Action */}
          <AppButton
            title="Sign In"
            onPress={handleSignIn}
            loading={isSubmitting}
            fullWidth
            size="lg"
            style={{ marginTop: Spacing.sm }}
          />

          {/* Register as Clinical Staff Action */}
          <View style={styles.registerContainer}>
            <Text style={[styles.registerPrompt, { color: colors.textSecondary }]}>
              New to visioENT?
            </Text>
            <Pressable
              onPress={handleRegisterAsClinicalStaff}
              style={styles.registerBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.registerText, { color: colors.primary }]}>
                Register as Clinical Staff
              </Text>
            </Pressable>
          </View>

          {/* Demo Account Switcher for Testing */}
          <View style={[styles.demoSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.demoTitle, { color: colors.textMuted }]}>
              SELECT DEMO CREDENTIALS:
            </Text>

            <View style={styles.demoChipsRow}>
              <Pressable
                onPress={() => fillDemoAccount('operator@curaxion.health')}
                style={[
                  styles.demoChip,
                  {
                    backgroundColor:
                      email === 'operator@curaxion.health'
                        ? colors.primaryLight
                        : colors.surfaceSecondary,
                    borderColor:
                      email === 'operator@curaxion.health'
                        ? colors.primary
                        : colors.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.demoChipText,
                    {
                      color:
                        email === 'operator@curaxion.health'
                          ? colors.primaryDark
                          : colors.text,
                    },
                  ]}>
                  🏥 PHC Operator
                </Text>
              </Pressable>

              <Pressable
                onPress={() => fillDemoAccount('doctor.sharma@curaxion.health')}
                style={[
                  styles.demoChip,
                  {
                    backgroundColor:
                      email === 'doctor.sharma@curaxion.health'
                        ? colors.primaryLight
                        : colors.surfaceSecondary,
                    borderColor:
                      email === 'doctor.sharma@curaxion.health'
                        ? colors.primary
                        : colors.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.demoChipText,
                    {
                      color:
                        email === 'doctor.sharma@curaxion.health'
                          ? colors.primaryDark
                          : colors.text,
                    },
                  ]}>
                  👨‍⚕️ ENT Doctor
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Security / System Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            🔒 Secured Clinical Session • IEC 62304 Compliant Architecture
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
    flexGrow: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoIcon: {
    fontSize: 28,
  },
  appTitle: {
    ...Typography.title,
    fontSize: 24,
    letterSpacing: 1,
  },
  appSub: {
    ...Typography.caption,
    fontSize: 13,
    marginTop: 2,
  },
  teamLabel: {
    ...Typography.label,
    fontSize: 10,
    marginTop: 6,
    letterSpacing: 1.5,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  cardTitle: {
    ...Typography.subtitle,
    fontSize: 20,
  },
  cardSub: {
    ...Typography.body,
    fontSize: 13,
    marginTop: 3,
    marginBottom: Spacing.base,
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
  },
  errorText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
  },
  forgotText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  registerPrompt: {
    ...Typography.body,
    fontSize: 13,
  },
  registerBtn: {
    paddingVertical: 4,
  },
  registerText: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  demoSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  demoChipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  demoChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoChipText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...Typography.caption,
    fontSize: 11,
  },
});
