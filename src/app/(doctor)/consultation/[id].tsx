/**
 * Doctor Consultation Room for SMART ENT ENDOSCOPE
 * Allows remote doctor to view endoscope feed, review patient video,
 * record clinical findings, provisional diagnosis, doctor's advice / plan,
 * and finalize the consultation.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  Image,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { AppButton } from '@/components/common/AppButton';
import { AppInput } from '@/components/common/AppInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { ConsultationChat } from '@/components/consultation/ConsultationChat';
import { webrtcService } from '@/services/webrtc/webrtcService';
import { signalingService } from '@/services/webrtc/signalingService';
import { endoscopeTransport } from '@/services/webrtc/endoscopeTransport';
import { CallControls } from '@/components/consultation/CallControls';

export default function DoctorConsultationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const {
    getConsultation,
    getPatient,
    acceptConsultation,
    connectConsultation,
    startActiveConsultation,
    updateConsultationNotes,
    completeConsultation,
    addCapturedMedia,
  } = useApp();

  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const consultation = id ? getConsultation(id) : undefined;
  const patient = consultation ? getPatient(consultation.patientId) : undefined;

  // Clinical Notes State
  const [clinicalFindings, setClinicalFindings] = useState(
    consultation?.clinicalFindings || ''
  );
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState(
    consultation?.provisionalDiagnosis || ''
  );
  const [doctorAdvicePlan, setDoctorAdvicePlan] = useState(
    consultation?.doctorAdvicePlan || ''
  );
  const [consultationNotes, setConsultationNotes] = useState(
    consultation?.consultationNotes || ''
  );
  const [lowerTab, setLowerTab] = useState<'notes' | 'chat'>('notes');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [endoscopeFrame, setEndoscopeFrame] = useState<string | null>(null);
  const [transportStats, setTransportStats] = useState({ fps: 0, latencyMs: 0 });

  useEffect(() => {
    if (!consultation) return;
    const isCallActive = consultation.status === 'connecting' || consultation.status === 'active';

    if (isCallActive) {
      let isMounted = true;
      (async () => {
        await webrtcService.startLocalMedia({ video: false, audio: true });
        if (!isMounted) return;

        const pc = webrtcService.initializePeerConnection();
        endoscopeTransport.connect(pc, false);
        await signalingService.startSignaling(consultation.id, 'doctor', currentUser?.id || 'doc-01');
      })();

      const unsubRemote = webrtcService.addRemoteStreamListener((s) => {
        setRemoteStream(s);
      });

      const unsubFrame = endoscopeTransport.onFrameReceived((frameUri, latencyMs) => {
        setEndoscopeFrame(frameUri);
        const stats = endoscopeTransport.getStats();
        setTransportStats({ fps: stats.fps, latencyMs });
      });

      return () => {
        isMounted = false;
        unsubRemote();
        unsubFrame();
        signalingService.stopSignaling();
        endoscopeTransport.disconnect();
        webrtcService.close();
        setRemoteStream(null);
        setEndoscopeFrame(null);
      };
    }
  }, [consultation, currentUser?.id]);

  if (!consultation || !patient) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title="Doctor Consultation" showBack />
        <ErrorState
          message="Consultation record could not be loaded."
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const isCompleted = consultation.status === 'completed';
  const isActive = consultation.status === 'active';
  const doctorId =
    currentUser?.id === 'user-doc-01'
      ? 'doc-01'
      : (currentUser?.id || 'doc-01');

  // Doctor captures a frame from remote feed
  const handleCaptureFrame = () => {
    if (endoscopeFrame) {
      addCapturedMedia(consultation.id, {
        uri: endoscopeFrame,
        type: 'image',
        capturedBy: 'doctor',
        label: `Doctor Snapshot #${(consultation.capturedMedia?.length || 0) + 1}`,
      });
      Alert.alert(
        'Snapshot Captured',
        'Remote endoscope frame saved to consultation media.'
      );
    } else {
      Alert.alert(
        'Camera Frame Not Available',
        'No frame received from endoscope camera yet. The PHC operator must capture or stream frames.'
      );
    }
  };

  // Complete consultation (Doctor only, from active state only)
  const handleComplete = () => {
    if (!isActive) {
      Alert.alert(
        'Action Prohibited',
        "Clinical safety rule: Consultation must be in 'active' live state before it can be completed."
      );
      return;
    }

    if (!provisionalDiagnosis.trim()) {
      Alert.alert(
        'Required Field',
        'Please enter a Provisional Diagnosis before completing the consultation.'
      );
      return;
    }

    Alert.alert(
      'Sign & Complete Consultation?',
      'This will finalize the clinical record, sign off medical advice, and set the status to COMPLETED.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Consultation',
          style: 'default',
          onPress: () => {
            const compResult = completeConsultation(
              consultation.id,
              {
                clinicalFindings: clinicalFindings.trim(),
                provisionalDiagnosis: provisionalDiagnosis.trim(),
                doctorAdvicePlan: doctorAdvicePlan.trim(),
                consultationNotes: consultationNotes.trim(),
              },
              'doctor'
            );

            if (!compResult.success) {
              Alert.alert('Completion Error', compResult.error || 'Failed to complete consultation.');
              return;
            }

            Alert.alert(
              'Consultation Completed',
              `Consultation ${consultation.consultationNumber} for ${patient.name} has been completed and signed off.`,
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(doctor)'),
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title={`Session: ${consultation.consultationNumber}`}
        subtitle={`${patient.name} • ${patient.patientId}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Patient Status & Connectivity Strip */}
        <View style={[styles.statusBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.patientInfo}>
            <Text style={[styles.patientName, { color: colors.text }]}>
              {patient.name} ({patient.age}y/{patient.gender})
            </Text>
            <Text style={[styles.patientComplaint, { color: colors.textSecondary }]}>
              Complaint: {patient.entComplaint.duration} • Severity: {patient.entComplaint.severity.toUpperCase()}
            </Text>
            <Text style={[styles.patientFacility, { color: colors.textSecondary }]}>
              Origin: {patient.facility}
            </Text>
          </View>

          <View style={styles.badgeCol}>
            <StatusBadge status={consultation.status} size="sm" />
            {consultation.status === 'requested' && (
              <AppButton
                title="Accept Request"
                onPress={() => {
                  const res = acceptConsultation(consultation.id, doctorId, 'doctor');
                  if (!res.success) Alert.alert('Notice', res.error);
                }}
                size="sm"
                style={{ marginTop: 4 }}
              />
            )}
            {consultation.status === 'accepted' && (
              <AppButton
                title="Connect Feed"
                onPress={() => {
                  const res = connectConsultation(consultation.id, 'doctor');
                  if (!res.success) Alert.alert('Notice', res.error);
                }}
                size="sm"
                style={{ marginTop: 4 }}
              />
            )}
            {consultation.status === 'connecting' && (
              <AppButton
                title="Activate Live"
                onPress={() => {
                  const res = startActiveConsultation(consultation.id, 'doctor');
                  if (!res.success) Alert.alert('Notice', res.error);
                }}
                size="sm"
                style={{ marginTop: 4 }}
              />
            )}
            {consultation.examinationEndedByOperator && (
              <View style={[styles.endedTag, { backgroundColor: colors.statusCompletedBg }]}>
                <Text style={[styles.endedTagText, { color: colors.statusCompleted }]}>
                  Operator Exam Concluded
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* WebRTC Audio/Video Controls */}
        {(consultation.status === 'connecting' || consultation.status === 'active') && (
          <CallControls />
        )}

        {/* PRIMARY VIEW: Large Remote Endoscope Feed */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            REMOTE ENDOSCOPIC FEED (ESP32-S3 LIVE STREAM)
          </Text>

          <View style={[styles.remoteEndoscopeBox, { borderColor: colors.border }]}>
            <View style={styles.feedOverlayTop}>
              <View style={styles.liveTag}>
                <View
                  style={[
                    styles.liveDot,
                    { backgroundColor: endoscopeFrame ? '#22C55E' : '#D97706' },
                  ]}
                />
                <Text style={styles.liveText}>
                  {endoscopeFrame ? 'REMOTE STREAM ACTIVE' : 'AWAITING ENDOSCOPE RELAY'}
                </Text>
              </View>
              <Text style={styles.feedSpecs}>
                {transportStats.fps > 0
                  ? `${transportStats.fps} FPS • ${transportStats.latencyMs}ms`
                  : '1080p • Standby'}
              </Text>
            </View>

            {/* Live Endoscope Frame or Reticle */}
            {endoscopeFrame ? (
              <Image
                source={{ uri: endoscopeFrame }}
                style={styles.opticalFeedImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.scopeReticle}>
                <View style={styles.crossH} />
                <View style={styles.crossV} />
                <Text style={styles.scopeLabel}>ENDOSCOPE OPTICAL FEED</Text>
                <Text style={styles.scopeSub}>Stream relayed from PHC Station 01</Text>
              </View>
            )}

            {/* Doctor Capture Action */}
            <View style={styles.feedOverlayBottom}>
              <AppButton
                title="📸 Capture Frame"
                onPress={handleCaptureFrame}
                variant="primary"
                size="sm"
              />
            </View>
          </View>
        </View>

        {/* SECONDARY VIEW: Patient Facing Video */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PATIENT / OPERATOR TWO-WAY CAMERA (WEBRTC)
          </Text>

          <View style={[styles.patientCameraBox, { borderColor: colors.border }]}>
            {remoteStream ? (
              <RTCView
                streamURL={remoteStream.toURL()}
                style={styles.remoteVideo}
                objectFit="cover"
              />
            ) : (
              <View style={styles.pipRow}>
                <View style={styles.pipCol}>
                  <Text style={{ fontSize: 24 }}>👤</Text>
                  <Text style={styles.pipName}>{patient.name}</Text>
                  <Text style={styles.pipRole}>Patient (At PHC)</Text>
                </View>

                <View style={styles.pipCol}>
                  <Text style={{ fontSize: 24 }}>👨‍⚕️</Text>
                  <Text style={styles.pipName}>Local Operator</Text>
                  <Text style={styles.pipRole}>PHC Examiner</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Captured Examination Media Strip */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            CAPTURED MEDIA GALLERY ({consultation.capturedMedia?.length || 0})
          </Text>

          {consultation.capturedMedia && consultation.capturedMedia.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
              {consultation.capturedMedia.map((m, idx) => (
                <View
                  key={m.id || idx}
                  style={[styles.thumbCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 22 }}>🖼️</Text>
                  <Text style={[styles.thumbText, { color: colors.text }]}>
                    {m.label || `Frame #${idx + 1}`}
                  </Text>
                  <Text style={[styles.thumbAuthor, { color: colors.textSecondary }]}>
                    By {m.capturedBy}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.emptyStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyStripText, { color: colors.textMuted }]}>
                No captured examination frames yet.
              </Text>
            </View>
          )}
        </View>

        {/* Segmented Tab: Clinical Findings vs Consultation Chat */}
        <View
          style={[
            styles.tabSelectorRow,
            { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
          ]}>
          <Pressable
            onPress={() => setLowerTab('notes')}
            style={[
              styles.tabSelectorBtn,
              lowerTab === 'notes' && [
                styles.tabSelectorBtnActive,
                { backgroundColor: colors.surface, borderColor: colors.primary },
              ],
            ]}>
            <Text
              style={[
                styles.tabSelectorText,
                {
                  color:
                    lowerTab === 'notes' ? colors.primaryDark : colors.textMuted,
                },
              ]}>
              📋 Clinical Notes & Diagnosis
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setLowerTab('chat')}
            style={[
              styles.tabSelectorBtn,
              lowerTab === 'chat' && [
                styles.tabSelectorBtnActive,
                { backgroundColor: colors.surface, borderColor: colors.primary },
              ],
            ]}>
            <Text
              style={[
                styles.tabSelectorText,
                {
                  color:
                    lowerTab === 'chat' ? colors.primaryDark : colors.textMuted,
                },
              ]}>
              💬 Consultation Chat
            </Text>
          </Pressable>
        </View>

        {lowerTab === 'notes' ? (
          /* ================= CLINICAL FINDINGS SECTION ================= */
          <View style={[styles.clinicalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.clinicalCardTitle, { color: colors.primary }]}>
              DOCTOR CLINICAL FINDINGS & DIAGNOSIS
            </Text>

            {/* 1. Clinical Findings */}
            <AppInput
              label="Clinical Findings"
              placeholder="Document endoscopic observations (e.g. Tympanic membrane condition, perforation, mucosa, discharge, polyps)..."
              value={clinicalFindings}
              editable={!isCompleted}
              onChangeText={(text) => {
                setClinicalFindings(text);
                updateConsultationNotes(consultation.id, { clinicalFindings: text });
              }}
              multiline
              numberOfLines={4}
            />

            {/* 2. Provisional Diagnosis */}
            <AppInput
              label="Provisional Diagnosis"
              placeholder="e.g. Acute Suppurative Otitis Media (Right Ear)"
              value={provisionalDiagnosis}
              editable={!isCompleted}
              onChangeText={(text) => {
                setProvisionalDiagnosis(text);
                updateConsultationNotes(consultation.id, { provisionalDiagnosis: text });
              }}
              required
            />

            {/* 3. Doctor's Advice / Plan */}
            <AppInput
              label="Doctor's Advice / Plan"
              placeholder="Enter clinical management plan, medication advice, ear/nose/throat precautions, referral instructions..."
              value={doctorAdvicePlan}
              editable={!isCompleted}
              onChangeText={(text) => {
                setDoctorAdvicePlan(text);
                updateConsultationNotes(consultation.id, { doctorAdvicePlan: text });
              }}
              multiline
              numberOfLines={4}
            />

            {/* 4. Consultation Notes */}
            <AppInput
              label="Consultation Notes"
              placeholder="Internal remarks, follow-up schedule, counseling notes for PHC staff..."
              value={consultationNotes}
              editable={!isCompleted}
              onChangeText={(text) => {
                setConsultationNotes(text);
                updateConsultationNotes(consultation.id, { consultationNotes: text });
              }}
              multiline
              numberOfLines={2}
            />

            {/* Complete Consultation Action */}
            {!isCompleted ? (
              <>
                <AppButton
                  title="✓ Complete Consultation"
                  onPress={handleComplete}
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!isActive}
                  style={{ marginTop: Spacing.sm }}
                />

                {!isActive && (
                  <Text style={[styles.legalNote, { color: colors.statusBusy }]}>
                    ⚠️ State is &apos;{consultation.status}&apos;. Live feed must be active before completing.
                  </Text>
                )}

                <Text style={[styles.legalNote, { color: colors.textMuted }]}>
                  Finalizing completes the tele-consultation record and makes the advice accessible to the PHC operator and patient.
                </Text>
              </>
            ) : (
              <View style={{ marginTop: Spacing.md, alignItems: 'center' }}>
                <Text style={[Typography.bodyBold, { color: colors.statusCompleted }]}>
                  ✓ Consultation Finalized & Signed Off
                </Text>
                <Text style={[styles.legalNote, { color: colors.textMuted }]}>
                  Record completed on {new Date(consultation.completedAt || '').toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* ================= CONSULTATION CHAT SECTION ================= */
          <View style={{ marginBottom: Spacing.xl }}>
            <ConsultationChat
              consultationId={consultation.id}
              currentUserId={currentUser?.id || 'doc-01'}
              currentUserName={currentUser?.name || 'ENT Specialist'}
              currentUserRole="doctor"
              isCompleted={isCompleted}
              maxHeight={460}
            />
          </View>
        )}
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
    paddingBottom: Spacing.xxl + 25,
  },
  statusBar: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  patientInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  patientName: {
    ...Typography.subtitle,
    fontSize: 16,
  },
  patientComplaint: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  patientFacility: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  endedTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  endedTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  sectionWrapper: {
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.label,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  remoteEndoscopeBox: {
    height: 250,
    backgroundColor: '#000000',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  opticalFeedImage: {
    width: '100%',
    height: '100%',
  },
  feedOverlayTop: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  feedSpecs: {
    color: '#94A3B8',
    fontSize: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  scopeReticle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  crossH: {
    position: 'absolute',
    width: 160,
    height: 1,
    backgroundColor: 'rgba(0, 140, 149, 0.3)',
  },
  crossV: {
    position: 'absolute',
    width: 1,
    height: 160,
    backgroundColor: 'rgba(0, 140, 149, 0.3)',
  },
  scopeLabel: {
    color: '#008C95',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  scopeSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },
  feedOverlayBottom: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 10,
  },
  patientCameraBox: {
    height: 110,
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    justifyContent: 'center',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
  },
  pipRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  pipCol: {
    alignItems: 'center',
  },
  pipName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  pipRole: {
    color: '#64748B',
    fontSize: 10,
  },
  thumbScroll: {
    flexDirection: 'row',
  },
  thumbCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginRight: Spacing.sm,
    alignItems: 'center',
    width: 95,
  },
  thumbText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  thumbAuthor: {
    ...Typography.caption,
    fontSize: 9,
  },
  emptyStrip: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyStripText: {
    ...Typography.caption,
    fontSize: 12,
  },
  clinicalCard: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginTop: Spacing.sm,
  },
  clinicalCardTitle: {
    ...Typography.label,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: Spacing.base,
  },
  legalNote: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 16,
  },
  tabSelectorRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 3,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  tabSelectorBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabSelectorBtnActive: {
    borderWidth: 1,
  },
  tabSelectorText: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
});
