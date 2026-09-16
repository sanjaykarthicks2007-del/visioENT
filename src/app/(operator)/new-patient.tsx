/**
 * Patient Registration & Clinical Intake Form for SMART ENT ENDOSCOPE
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
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { ENTComplaint, RelevantHistory } from '@/types';

type GenderOption = 'Male' | 'Female' | 'Other';
type SeverityOption = 'mild' | 'moderate' | 'severe' | 'acute';

export default function NewPatientScreen() {
  const { currentUser } = useAuth();
  const { addPatient } = useApp();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // Section 1: Basic Demographics
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<GenderOption>('Male');
  const [contactNumber, setContactNumber] = useState('');
  const [facility, setFacility] = useState(currentUser?.facility || 'PHC Rampur - Station 01');

  // Section 2: ENT Complaints
  const [complaint, setComplaint] = useState<ENTComplaint>({
    earPain: false,
    hearingDifficulty: false,
    earDischarge: false,
    tinnitus: false,
    vertigo: false,
    noseBlockage: false,
    nasalDischarge: false,
    epistaxis: false,
    facialPain: false,
    throatPain: false,
    difficultySwallowing: false,
    foreignBodySensation: false,
    hoarseness: false,
    other: false,
    otherDetails: '',
    duration: '',
    severity: 'moderate',
    associatedSymptoms: '',
    additionalNotes: '',
  });

  // Section 3: Relevant History
  const [history, setHistory] = useState<RelevantHistory>({
    previousEntProblems: '',
    previousEntSurgery: '',
    currentMedication: '',
    knownAllergies: '',
    relevantMedicalHistory: '',
  });

  // Section 4: Operator Observations
  const [operatorNotes, setOperatorNotes] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleSymptom = (key: keyof ENTComplaint) => {
    setComplaint((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Patient name is required.';
    if (!age.trim() || isNaN(Number(age)) || Number(age) <= 0) {
      errs.age = 'Please enter a valid age.';
    }
    if (!contactNumber.trim()) errs.contactNumber = 'Contact number is required.';
    if (!complaint.duration.trim()) errs.duration = 'Please specify duration (e.g. 3 days).';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (continueToDoctor: boolean) => {
    if (!validate()) {
      Alert.alert('Required Fields', 'Please complete the required demographic and clinical fields.');
      return;
    }

    const newPatient = addPatient({
      name: name.trim(),
      age: Number(age),
      gender,
      contactNumber: contactNumber.trim(),
      facility: facility.trim(),
      entComplaint: complaint,
      relevantHistory: history,
      operatorNotes: operatorNotes.trim(),
    });

    if (continueToDoctor) {
      router.push({
        pathname: '/(operator)/doctors',
        params: { patientId: newPatient.id },
      });
    } else {
      Alert.alert('Patient Saved', `Patient ${newPatient.name} (${newPatient.patientId}) registered successfully.`, [
        {
          text: 'OK',
          onPress: () => router.push('/(operator)/patients'),
        },
      ]);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="Patient Registration"
        subtitle="ENT Intake & Examination Record"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ================= SECTION 1 ================= */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            SECTION 1 — BASIC INFORMATION
          </Text>

          <AppInput
            label="Patient Full Name"
            placeholder="Enter patient full name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            error={errors.name}
            required
          />

          <View style={styles.twoColumnRow}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <AppInput
                label="Age (Years)"
                placeholder="e.g. 35"
                value={age}
                onChangeText={(text) => {
                  setAge(text);
                  if (errors.age) setErrors((prev) => ({ ...prev, age: '' }));
                }}
                keyboardType="numeric"
                error={errors.age}
                required
              />
            </View>

            <View style={{ flex: 1.5 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Gender <Text style={{ color: colors.danger }}>*</Text>
              </Text>
              <View style={styles.chipRow}>
                {(['Male', 'Female', 'Other'] as GenderOption[]).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    style={[
                      styles.choiceChip,
                      {
                        backgroundColor:
                          gender === g
                            ? colors.primaryLight
                            : colors.surfaceSecondary,
                        borderColor:
                          gender === g ? colors.primary : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.choiceChipText,
                        {
                          color:
                            gender === g
                              ? colors.primaryDark
                              : colors.text,
                        },
                      ]}>
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <AppInput
            label="Contact Number"
            placeholder="e.g. +91 98765 43210"
            value={contactNumber}
            onChangeText={(text) => {
              setContactNumber(text);
              if (errors.contactNumber) setErrors((prev) => ({ ...prev, contactNumber: '' }));
            }}
            keyboardType="phone-pad"
            error={errors.contactNumber}
            required
          />

          <AppInput
            label="Facility / Health Center"
            value={facility}
            onChangeText={setFacility}
            placeholder="Current PHC Name"
          />
        </View>

        {/* ================= SECTION 2 ================= */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            SECTION 2 — ENT COMPLAINT
          </Text>

          <Text style={[styles.subSectionHeading, { color: colors.textSecondary }]}>
            Ear Symptoms:
          </Text>
          <View style={styles.checkboxGrid}>
            {[
              { key: 'earPain', label: 'Ear Pain' },
              { key: 'hearingDifficulty', label: 'Hearing Difficulty' },
              { key: 'earDischarge', label: 'Ear Discharge' },
              { key: 'tinnitus', label: 'Tinnitus' },
              { key: 'vertigo', label: 'Dizziness / Vertigo' },
            ].map(({ key, label }) => {
              const isChecked = !!complaint[key as keyof ENTComplaint];
              return (
                <Pressable
                  key={key}
                  onPress={() => toggleSymptom(key as keyof ENTComplaint)}
                  style={[
                    styles.checkboxChip,
                    {
                      backgroundColor: isChecked ? colors.primaryLight : colors.surfaceSecondary,
                      borderColor: isChecked ? colors.primary : colors.border,
                    },
                  ]}>
                  <Text style={[styles.checkboxText, { color: isChecked ? colors.primaryDark : colors.text }]}>
                    {isChecked ? '☑ ' : '☐ '} {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.subSectionHeading, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            Nose & Sinus Symptoms:
          </Text>
          <View style={styles.checkboxGrid}>
            {[
              { key: 'noseBlockage', label: 'Nose Blockage' },
              { key: 'nasalDischarge', label: 'Nasal Discharge' },
              { key: 'epistaxis', label: 'Nose Bleeding / Epistaxis' },
              { key: 'facialPain', label: 'Facial Pain' },
            ].map(({ key, label }) => {
              const isChecked = !!complaint[key as keyof ENTComplaint];
              return (
                <Pressable
                  key={key}
                  onPress={() => toggleSymptom(key as keyof ENTComplaint)}
                  style={[
                    styles.checkboxChip,
                    {
                      backgroundColor: isChecked ? colors.primaryLight : colors.surfaceSecondary,
                      borderColor: isChecked ? colors.primary : colors.border,
                    },
                  ]}>
                  <Text style={[styles.checkboxText, { color: isChecked ? colors.primaryDark : colors.text }]}>
                    {isChecked ? '☑ ' : '☐ '} {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.subSectionHeading, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            Throat & Larynx Symptoms:
          </Text>
          <View style={styles.checkboxGrid}>
            {[
              { key: 'throatPain', label: 'Throat Pain' },
              { key: 'difficultySwallowing', label: 'Difficulty Swallowing' },
              { key: 'foreignBodySensation', label: 'Foreign Body Sensation' },
              { key: 'hoarseness', label: 'Hoarseness of Voice' },
              { key: 'other', label: 'Other' },
            ].map(({ key, label }) => {
              const isChecked = !!complaint[key as keyof ENTComplaint];
              return (
                <Pressable
                  key={key}
                  onPress={() => toggleSymptom(key as keyof ENTComplaint)}
                  style={[
                    styles.checkboxChip,
                    {
                      backgroundColor: isChecked ? colors.primaryLight : colors.surfaceSecondary,
                      borderColor: isChecked ? colors.primary : colors.border,
                    },
                  ]}>
                  <Text style={[styles.checkboxText, { color: isChecked ? colors.primaryDark : colors.text }]}>
                    {isChecked ? '☑ ' : '☐ '} {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {complaint.other && (
            <AppInput
              label="Other Complaint Details"
              placeholder="Specify other symptoms..."
              value={complaint.otherDetails || ''}
              onChangeText={(text) =>
                setComplaint((prev) => ({ ...prev, otherDetails: text }))
              }
              containerStyle={{ marginTop: Spacing.sm }}
            />
          )}

          {/* Duration & Severity */}
          <View style={[styles.twoColumnRow, { marginTop: Spacing.md }]}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <AppInput
                label="Duration"
                placeholder="e.g. 4 days"
                value={complaint.duration}
                onChangeText={(text) => {
                  setComplaint((prev) => ({ ...prev, duration: text }));
                  if (errors.duration) setErrors((prev) => ({ ...prev, duration: '' }));
                }}
                error={errors.duration}
                required
              />
            </View>

            <View style={{ flex: 1.5 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Severity
              </Text>
              <View style={styles.chipRow}>
                {(['mild', 'moderate', 'severe', 'acute'] as SeverityOption[]).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setComplaint((prev) => ({ ...prev, severity: s }))}
                    style={[
                      styles.choiceChip,
                      {
                        backgroundColor:
                          complaint.severity === s
                            ? s === 'severe' || s === 'acute'
                              ? colors.dangerBg
                              : colors.primaryLight
                            : colors.surfaceSecondary,
                        borderColor:
                          complaint.severity === s
                            ? s === 'severe' || s === 'acute'
                              ? colors.danger
                              : colors.primary
                            : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.choiceChipText,
                        {
                          color:
                            complaint.severity === s
                              ? s === 'severe' || s === 'acute'
                                ? colors.danger
                                : colors.primaryDark
                              : colors.text,
                        },
                      ]}>
                      {s.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <AppInput
            label="Associated Symptoms"
            placeholder="e.g. Fever, headache, vomiting, cough"
            value={complaint.associatedSymptoms}
            onChangeText={(text) =>
              setComplaint((prev) => ({ ...prev, associatedSymptoms: text }))
            }
          />

          <AppInput
            label="Additional ENT Notes"
            placeholder="Any specific complaint details noticed by patient..."
            value={complaint.additionalNotes}
            onChangeText={(text) =>
              setComplaint((prev) => ({ ...prev, additionalNotes: text }))
            }
            multiline
            numberOfLines={2}
          />
        </View>

        {/* ================= SECTION 3 ================= */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            SECTION 3 — RELEVANT HISTORY
          </Text>

          <AppInput
            label="Previous ENT Problems"
            placeholder="e.g. Past ear infections, chronic sinusitis, nasal polyps"
            value={history.previousEntProblems}
            onChangeText={(text) =>
              setHistory((prev) => ({ ...prev, previousEntProblems: text }))
            }
          />

          <AppInput
            label="Previous ENT Surgery"
            placeholder="e.g. Septoplasty, Tympanoplasty, None"
            value={history.previousEntSurgery}
            onChangeText={(text) =>
              setHistory((prev) => ({ ...prev, previousEntSurgery: text }))
            }
          />

          <AppInput
            label="Current Medication"
            placeholder="e.g. Antihistamines, ear drops, antibiotics, analgesics"
            value={history.currentMedication}
            onChangeText={(text) =>
              setHistory((prev) => ({ ...prev, currentMedication: text }))
            }
          />

          <AppInput
            label="Known Allergies"
            placeholder="e.g. Penicillin, Sulfa, Dust, None reported"
            value={history.knownAllergies}
            onChangeText={(text) =>
              setHistory((prev) => ({ ...prev, knownAllergies: text }))
            }
          />

          <AppInput
            label="Relevant General Medical History"
            placeholder="e.g. Diabetes, Hypertension, Asthma, Tobacco chew/smoke"
            value={history.relevantMedicalHistory}
            onChangeText={(text) =>
              setHistory((prev) => ({ ...prev, relevantMedicalHistory: text }))
            }
          />
        </View>

        {/* ================= SECTION 4 ================= */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            SECTION 4 — OPERATOR OBSERVATIONS
          </Text>

          <AppInput
            label="Clinical Observations by Operator"
            placeholder="e.g. Visible ear discharge right canal, patient in distress, mucosa congested..."
            value={operatorNotes}
            onChangeText={setOperatorNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Form Actions */}
        <View style={styles.submitSection}>
          <AppButton
            title="Continue to Doctor Selection →"
            onPress={() => handleSave(true)}
            variant="primary"
            size="lg"
            fullWidth
          />

          <AppButton
            title="Save Patient Only"
            onPress={() => handleSave(false)}
            variant="secondary"
            size="md"
            fullWidth
            style={{ marginTop: Spacing.sm }}
          />
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
  sectionCard: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.label,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: Spacing.base,
  },
  subSectionHeading: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  twoColumnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputLabel: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  choiceChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 46,
  },
  choiceChipText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  checkboxChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    minHeight: 40,
    justifyContent: 'center',
  },
  checkboxText: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  submitSection: {
    marginTop: Spacing.sm,
  },
});
