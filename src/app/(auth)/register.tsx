/**
 * Clinical Staff Registration Screen for visioENT
 *
 * Direct public registration for PHC Operators and ENT Doctors.
 * Creates a real Firebase Auth account and synchronized Firestore users/{uid} profile.
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
import { AppHeader } from '@/components/common/AppHeader';
import { AppButton } from '@/components/common/AppButton';
import { AppInput } from '@/components/common/AppInput';
import { registerClinicalUser } from '@/services/firebase/userService';
import { Role } from '@/types';

const MEDICAL_DEGREES = [
  'MBBS',
  'MBBS + MS ENT',
  'MBBS + DNB ENT',
  'Other',
];

const ADDITIONAL_QUALIFICATIONS = [
  'None',
  'MS ENT',
  'DNB ENT',
  'Diploma (DLO)',
  'Fellowship',
  'Other',
];

const SUB_SPECIALIZATIONS = [
  'General ENT',
  'Otology',
  'Rhinology',
  'Laryngology',
  'Head & Neck Surgery',
  'Pediatric ENT',
  'Neurotology',
  'Sleep Medicine',
  'Other',
];

const DESIGNATIONS = [
  'ENT Specialist',
  'Consultant',
  'Senior Consultant',
  'Resident',
  'Other',
];

const CONSULTATION_MODES: ('In-person' | 'Teleconsultation' | 'Both')[] = [
  'Both',
  'Teleconsultation',
  'In-person',
];

const COMMON_LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Kannada'];

export default function RegisterScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // Role Selection
  const [role, setRole] = useState<Role>('operator');

  // Common Personal Information
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Operator-Specific Work / Facility
  const [facilityName, setFacilityName] = useState('PHC Rampur - Station 01');
  const [stationDept, setStationDept] = useState('Station 01 (Endoscope Dedicated)');

  // Doctor-Specific Professional Info
  const [medicalDegree, setMedicalDegree] = useState('MBBS + MS ENT');
  const [customMedicalDegree, setCustomMedicalDegree] = useState('');
  const [additionalQualification, setAdditionalQualification] = useState('DNB ENT');
  const [customAdditionalQual, setCustomAdditionalQual] = useState('');
  const [experienceYears, setExperienceYears] = useState('8');

  // Doctor-Specific ENT Specialization
  const [primarySpecialty, setPrimarySpecialty] = useState('ENT / Otorhinolaryngology');
  const [subSpecialization, setSubSpecialization] = useState('Otology');
  const [customSubSpec, setCustomSubSpec] = useState('');

  // Doctor-Specific Practice Details
  const [currentHospital, setCurrentHospital] = useState('District Hospital Tele-ENT Center');
  const [designation, setDesignation] = useState('ENT Specialist');
  const [customDesignation, setCustomDesignation] = useState('');
  const [consultationMode, setConsultationMode] = useState<'In-person' | 'Teleconsultation' | 'Both'>('Both');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English', 'Hindi']);

  // Account Security
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Validation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const validate = (): boolean => {
    if (!name.trim()) {
      setErrorMessage('Full name is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }
    if (!phone.trim()) {
      setErrorMessage('Phone number is required.');
      return false;
    }

    if (role === 'operator') {
      if (!facilityName.trim()) {
        setErrorMessage('Facility / Centre is required.');
        return false;
      }
      if (!stationDept.trim()) {
        setErrorMessage('Station / Department is required.');
        return false;
      }
    } else {
      // Doctor validations
      const resolvedDegree = medicalDegree === 'Other' ? customMedicalDegree.trim() : medicalDegree;
      if (!resolvedDegree) {
        setErrorMessage('Medical degree is required.');
        return false;
      }
      if (!primarySpecialty.trim()) {
        setErrorMessage('Primary specialty is required.');
        return false;
      }
      if (experienceYears.trim() && (isNaN(Number(experienceYears)) || Number(experienceYears) < 0)) {
        setErrorMessage('Years of experience must be valid numeric input.');
        return false;
      }
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return false;
    }

    setErrorMessage('');
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMessage('');

    const resolvedDegree = medicalDegree === 'Other' ? customMedicalDegree.trim() : medicalDegree;
    const resolvedAdditionalQual =
      additionalQualification === 'Other'
        ? customAdditionalQual.trim()
        : additionalQualification === 'None'
        ? ''
        : additionalQualification;
    const resolvedSubSpec =
      subSpecialization === 'Other' ? customSubSpec.trim() : subSpecialization;
    const resolvedDesignation =
      designation === 'Other' ? customDesignation.trim() : designation;

    try {
      const result = await registerClinicalUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim(),
        facilityName:
          role === 'doctor'
            ? currentHospital.trim() || 'District Hospital Tele-ENT Center'
            : facilityName.trim(),
        facilityId:
          role === 'doctor' ? 'DH-TELE-01' : 'PHC-RAMPUR-01',
        specialty: role === 'doctor' ? primarySpecialty.trim() : undefined,
        qualification:
          role === 'doctor'
            ? [resolvedDegree, resolvedAdditionalQual].filter(Boolean).join(', ')
            : undefined,
        medicalDegree: role === 'doctor' ? resolvedDegree : undefined,
        additionalQualification: role === 'doctor' ? resolvedAdditionalQual : undefined,
        subSpecialization: role === 'doctor' ? resolvedSubSpec : undefined,
        currentHospital: role === 'doctor' ? currentHospital.trim() : undefined,
        designation: role === 'doctor' ? resolvedDesignation : undefined,
        consultationMode: role === 'doctor' ? consultationMode : undefined,
        languages: role === 'doctor' ? selectedLanguages : undefined,
        experienceYears:
          role === 'doctor' && experienceYears.trim() ? Number(experienceYears) : undefined,
        isActive: true,
      });

      setIsSubmitting(false);

      if (!result.success) {
        setErrorMessage(result.error || 'Registration failed. Please check details.');
        return;
      }

      Alert.alert(
        'Registration Successful',
        `Account created for ${result.user?.name}.\n\nPlease sign in using your email and password.`,
        [
          {
            text: 'Sign In Now',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Internet connection is required to create a new account. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="Register as Clinical Staff"
        subtitle="Create Authorized Clinical Account"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ACCOUNT TYPE SELECTOR */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            ACCOUNT TYPE
          </Text>

          <View style={styles.roleRow}>
            <Pressable
              onPress={() => {
                setRole('operator');
                setErrorMessage('');
              }}
              style={[
                styles.roleOption,
                role === 'operator' && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primaryLight,
                },
                role !== 'operator' && {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}>
              <Text style={styles.roleIcon}>🏥</Text>
              <Text
                style={[
                  styles.roleText,
                  { color: role === 'operator' ? colors.primaryDark : colors.textSecondary },
                ]}>
                PHC Operator
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setRole('doctor');
                setErrorMessage('');
              }}
              style={[
                styles.roleOption,
                role === 'doctor' && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primaryLight,
                },
                role !== 'doctor' && {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}>
              <Text style={styles.roleIcon}>👨‍⚕️</Text>
              <Text
                style={[
                  styles.roleText,
                  { color: role === 'doctor' ? colors.primaryDark : colors.textSecondary },
                ]}>
                ENT Doctor
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Error Banner */}
        {errorMessage ? (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerBg }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* PERSONAL INFORMATION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            PERSONAL INFORMATION
          </Text>

          <AppInput
            label="Full Name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setErrorMessage('');
            }}
            placeholder={role === 'doctor' ? 'e.g. Dr. Ananya Sharma' : 'e.g. Ramesh Kumar'}
            required
          />

          <AppInput
            label="Email Address"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrorMessage('');
            }}
            placeholder={role === 'doctor' ? 'doctor@curaxion.health' : 'operator@curaxion.health'}
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />

          <AppInput
            label="Phone Number"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              setErrorMessage('');
            }}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            required
          />
        </View>

        {/* PHC OPERATOR: WORK / FACILITY INFORMATION */}
        {role === 'operator' && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              WORK / FACILITY INFORMATION
            </Text>

            <AppInput
              label="Facility / Centre"
              value={facilityName}
              onChangeText={setFacilityName}
              placeholder="e.g. PHC Rampur - Station 01"
              required
            />

            <AppInput
              label="Station / Department"
              value={stationDept}
              onChangeText={setStationDept}
              placeholder="e.g. Station 01 (Endoscope Dedicated)"
              required
            />
          </View>
        )}

        {/* ENT DOCTOR: PROFESSIONAL INFORMATION */}
        {role === 'doctor' && (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                PROFESSIONAL INFORMATION
              </Text>

              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Medical Degree *
              </Text>
              <View style={styles.chipRow}>
                {MEDICAL_DEGREES.map((deg) => (
                  <Pressable
                    key={deg}
                    onPress={() => setMedicalDegree(deg)}
                    style={[
                      styles.chip,
                      medicalDegree === deg
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        { color: medicalDegree === deg ? '#FFFFFF' : colors.text },
                      ]}>
                      {deg}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {medicalDegree === 'Other' && (
                <AppInput
                  label="Specify Medical Degree"
                  value={customMedicalDegree}
                  onChangeText={setCustomMedicalDegree}
                  placeholder="e.g. MBBS, MS (Otolaryngology)"
                  required
                />
              )}

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: Spacing.sm }]}>
                Additional Qualification
              </Text>
              <View style={styles.chipRow}>
                {ADDITIONAL_QUALIFICATIONS.map((qual) => (
                  <Pressable
                    key={qual}
                    onPress={() => setAdditionalQualification(qual)}
                    style={[
                      styles.chip,
                      additionalQualification === qual
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        { color: additionalQualification === qual ? '#FFFFFF' : colors.text },
                      ]}>
                      {qual}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {additionalQualification === 'Other' && (
                <AppInput
                  label="Specify Additional Qualification"
                  value={customAdditionalQual}
                  onChangeText={setCustomAdditionalQual}
                  placeholder="e.g. Fellowship in Rhinology"
                />
              )}

              <AppInput
                label="Years of Clinical Experience"
                value={experienceYears}
                onChangeText={setExperienceYears}
                placeholder="e.g. 8"
                keyboardType="numeric"
                style={{ marginTop: Spacing.sm }}
              />
            </View>

            {/* ENT DOCTOR: ENT SPECIALIZATION */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                ENT SPECIALIZATION
              </Text>

              <AppInput
                label="Primary Specialty"
                value={primarySpecialty}
                onChangeText={setPrimarySpecialty}
                placeholder="ENT / Otorhinolaryngology"
                required
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: Spacing.sm }]}>
                Sub-specialization / Area of Interest
              </Text>
              <View style={styles.chipRow}>
                {SUB_SPECIALIZATIONS.map((sub) => (
                  <Pressable
                    key={sub}
                    onPress={() => setSubSpecialization(sub)}
                    style={[
                      styles.chip,
                      subSpecialization === sub
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        { color: subSpecialization === sub ? '#FFFFFF' : colors.text },
                      ]}>
                      {sub}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {subSpecialization === 'Other' && (
                <AppInput
                  label="Specify Sub-specialization"
                  value={customSubSpec}
                  onChangeText={setCustomSubSpec}
                  placeholder="e.g. Skull Base Surgery"
                />
              )}
            </View>

            {/* ENT DOCTOR: PRACTICE DETAILS */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                PRACTICE DETAILS
              </Text>

              <AppInput
                label="Current Hospital / Clinic"
                value={currentHospital}
                onChangeText={setCurrentHospital}
                placeholder="e.g. District Hospital Tele-ENT Center"
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: Spacing.sm }]}>
                Designation
              </Text>
              <View style={styles.chipRow}>
                {DESIGNATIONS.map((des) => (
                  <Pressable
                    key={des}
                    onPress={() => setDesignation(des)}
                    style={[
                      styles.chip,
                      designation === des
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        { color: designation === des ? '#FFFFFF' : colors.text },
                      ]}>
                      {des}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {designation === 'Other' && (
                <AppInput
                  label="Specify Designation"
                  value={customDesignation}
                  onChangeText={setCustomDesignation}
                  placeholder="e.g. Associate Professor"
                />
              )}

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: Spacing.sm }]}>
                Consultation Mode
              </Text>
              <View style={styles.chipRow}>
                {CONSULTATION_MODES.map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => setConsultationMode(mode)}
                    style={[
                      styles.chip,
                      consultationMode === mode
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        { color: consultationMode === mode ? '#FFFFFF' : colors.text },
                      ]}>
                      {mode}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: Spacing.sm }]}>
                Languages Spoken (Multiple)
              </Text>
              <View style={styles.chipRow}>
                {COMMON_LANGUAGES.map((lang) => {
                  const isSel = selectedLanguages.includes(lang);
                  return (
                    <Pressable
                      key={lang}
                      onPress={() => toggleLanguage(lang)}
                      style={[
                        styles.chip,
                        isSel
                          ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                          : { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                      ]}>
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSel ? colors.primaryDark : colors.textSecondary },
                        ]}>
                        {isSel ? `✓ ${lang}` : lang}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* ACCOUNT SECURITY */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            ACCOUNT SECURITY
          </Text>

          <AppInput
            label="Password (min 6 chars)"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter secure password"
            secureTextEntry
            required
          />

          <AppInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter password"
            secureTextEntry
            required
          />
        </View>

        {/* SUBMIT BUTTON */}
        <View style={styles.actionSection}>
          <AppButton
            title={isSubmitting ? 'Creating Account...' : 'Complete Registration'}
            onPress={handleRegister}
            disabled={isSubmitting}
            size="lg"
            fullWidth
          />

          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Already have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign In</Text>
            </Text>
          </Pressable>
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
    paddingBottom: Spacing.xxl + 24,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.label,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  roleIcon: {
    fontSize: 20,
  },
  roleText: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 13,
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
  inputLabel: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  actionSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: Spacing.base,
    paddingVertical: Spacing.xs,
  },
  cancelText: {
    ...Typography.caption,
    fontSize: 13,
  },
});
