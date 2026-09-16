/**
 * Operator Consultation Room for SMART ENT ENDOSCOPE
 * Features live/mock endoscope feed, patient camera placeholder, media capture, and examination session controls.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  useColorScheme,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { AppButton } from '@/components/common/AppButton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EndoscopeStreamView } from '@/components/endoscope/EndoscopeStreamView';
import { ErrorState } from '@/components/common/ErrorState';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { cameraService } from '@/services/camera/cameraService';
import { ConsultationChat } from '@/components/consultation/ConsultationChat';
import { webrtcService } from '@/services/webrtc/webrtcService';
import { signalingService } from '@/services/webrtc/signalingService';
import { endoscopeTransport } from '@/services/webrtc/endoscopeTransport';
import { CallControls } from '@/components/consultation/CallControls';

export default function OperatorConsultationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getConsultation,
    getPatient,
    getDoctor,
    connectConsultation,
    startActiveConsultation,
    endOperatorExamination,
    addCapturedMedia,
  } = useApp();

  const { currentUser } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [bottomTab, setBottomTab] = useState<'media' | 'chat'>('media');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const consultation = id ? getConsultation(id) : undefined;
  const patient = consultation ? getPatient(consultation.patientId) : undefined;
  const doctor = consultation ? getDoctor(consultation.primaryDoctorId) : undefined;

  // WebRTC PeerConnection & Media Lifecycle
  useEffect(() => {
    if (!consultation) return;
    const isCallActive = consultation.status === 'connecting' || consultation.status === 'active';

    if (isCallActive) {
      let isMounted = true;
      (async () => {
        const stream = await webrtcService.startLocalMedia({ video: true, audio: true });
        if (!isMounted) return;
        setLocalStream(stream);

        const pc = webrtcService.initializePeerConnection();
        endoscopeTransport.connect(pc, true);
        await signalingService.startSignaling(consultation.id, 'operator', currentUser?.id || 'operator-01');
      })();

      const unsubLocal = webrtcService.addLocalStreamListener((s) => {
        setLocalStream(s);
      });

      const handleAppStateChange = (nextState: AppStateStatus) => {
        if (nextState === 'background') {
          webrtcService.toggleVideo();
        }
      };

      const appStateSub = AppState.addEventListener('change', handleAppStateChange);

      return () => {
        isMounted = false;
        appStateSub.remove();
        unsubLocal();
        signalingService.stopSignaling();
        endoscopeTransport.disconnect();
        webrtcService.close();
        setLocalStream(null);
      };
    }
  }, [consultation, currentUser?.id]);

  if (!consultation || !patient) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title="Consultation Session" showBack />
        <ErrorState
          message="Consultation record could not be loaded."
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  // Handle Capture from Real ESP32 /capture via cameraService
  const handleCapture = async () => {
    const currentState = cameraService.getConnectionState();

    if (currentState === 'DISCONNECTED' || currentState === 'ERROR') {
      Alert.alert(
        'Camera Not Connected',
        'Endoscope camera is not connected. Please verify Wi-Fi connection to SMART_ENT_ENDOSCOPE (192.168.4.1).'
      );
      return;
    }

    try {
      const result = await cameraService.captureFrame(3500);
      if (result.success && result.uri) {
        // Relay frame to remote doctor over WebRTC DataChannel
        endoscopeTransport.sendFrame(result.uri);

        const sizeKb = result.byteSize ? Math.round(result.byteSize / 1024) : 0;
        const now = new Date().toISOString();
        addCapturedMedia(consultation.id, {
          uri: result.uri,
          type: 'image',
          capturedBy: 'operator',
          label: `ESP32 Snapshot #${(consultation.capturedMedia?.length || 0) + 1} (${sizeKb} KB)`,
          notes: `Captured at ${now} for Patient ${patient.name} (${patient.patientId})`,
        });
        Alert.alert('Snapshot Saved', `Real endoscopic frame captured from ESP32 camera (${sizeKb} KB) and saved.`);
        return;
      }

      // Hardware capture returned an error or timed out
      Alert.alert(
        'Capture Failed',
        result.error || 'Endoscope camera is not connected. Ensure phone is connected to ESP32 Wi-Fi (192.168.4.1).'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Endoscope camera is not connected.';
      Alert.alert('Hardware Error', `Could not capture frame: ${msg}`);
    }
  };

  // Handle Recording Toggle (Mock)
  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setRecordSeconds(0);
      Alert.alert('Recording Saved', 'Session video clip saved to consultation media.');
    } else {
      setIsRecording(true);
      Alert.alert('Recording Started', 'Capturing endoscopic video stream (Mock)...');
    }
  };

  // Handle Operator Ending Local Examination
  const handleEndExamination = () => {
    Alert.alert(
      'Finish Local Examination?',
      'This will conclude the operator examination and save all captured media. The doctor will finalize the clinical notes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Examination',
          style: 'destructive',
          onPress: () => {
            endOperatorExamination(consultation.id);
            router.replace('/(operator)/history');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title={`Room: ${consultation.consultationNumber}`}
        subtitle={`${patient.name} (${patient.patientId})`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Triage & Doctor Info Bar */}
        <View style={[styles.statusBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusBarLeft}>
            <Text style={[styles.patientLabel, { color: colors.text }]}>
              {patient.name}, {patient.age}y/{patient.gender}
            </Text>
            <Text style={[styles.doctorLabel, { color: colors.textSecondary }]}>
              Remote Doctor: <Text style={{ fontWeight: '700' }}>{doctor?.name || 'Assigned Specialist'}</Text>
            </Text>
          </View>

          <View style={styles.statusBarRight}>
            <StatusBadge status={consultation.status} size="sm" />
            {consultation.status === 'accepted' && (
              <AppButton
                title="Connect Feed"
                onPress={() => {
                  const res = connectConsultation(consultation.id, 'operator');
                  if (!res.success) Alert.alert('Notice', res.error);
                }}
                size="sm"
                style={{ marginTop: 4 }}
              />
            )}
            {consultation.status === 'connecting' && (
              <AppButton
                title="Start Live"
                onPress={() => {
                  const res = startActiveConsultation(consultation.id, 'operator');
                  if (!res.success) Alert.alert('Notice', res.error);
                }}
                size="sm"
                style={{ marginTop: 4 }}
              />
            )}
          </View>
        </View>

        {/* WebRTC Audio/Video Controls */}
        {(consultation.status === 'connecting' || consultation.status === 'active') && (
          <CallControls />
        )}

        {/* PRIMARY VIEWPORT: Endoscope Camera Stream */}
        <View style={styles.viewportSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            OPTICAL ENDOSCOPE STREAM (ESP32-S3 / OV5640)
          </Text>

          <EndoscopeStreamView
            height={260}
            onCaptureFrame={handleCapture}
            showControls
          />
        </View>

        {/* SECONDARY VIEWPORT: Patient Front Camera */}
        <View style={[styles.secondaryVideoBox, { backgroundColor: '#0F172A', borderColor: colors.border }]}>
          <View style={styles.pipHeader}>
            <View style={styles.liveIndicator}>
              <View
                style={[
                  styles.liveDot,
                  { backgroundColor: localStream ? '#22C55E' : '#94A3B8' },
                ]}
              />
              <Text style={styles.liveText}>
                {localStream ? 'PATIENT FACING CAMERA (LIVE WEBRTC)' : 'PATIENT FACING CAMERA (STANDBY)'}
              </Text>
            </View>
          </View>

          {localStream ? (
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              mirror
            />
          ) : (
            <View style={styles.pipContent}>
              <Text style={styles.pipIcon}>👤</Text>
              <Text style={styles.pipTitle}>Front Face View: {patient.name}</Text>
              <Text style={styles.pipSub}>PHC Rampur Local Examination Station</Text>
            </View>
          )}
        </View>

        {/* Segmented Tab: Clinical Media vs Consultation Chat */}
        <View
          style={[
            styles.tabSelectorRow,
            { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
          ]}>
          <Pressable
            onPress={() => setBottomTab('media')}
            style={[
              styles.tabSelectorBtn,
              bottomTab === 'media' && [
                styles.tabSelectorBtnActive,
                { backgroundColor: colors.surface, borderColor: colors.primary },
              ],
            ]}>
            <Text
              style={[
                styles.tabSelectorText,
                {
                  color:
                    bottomTab === 'media' ? colors.primaryDark : colors.textMuted,
                },
              ]}>
              🖼️ Clinical Media ({consultation.capturedMedia?.length || 0})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setBottomTab('chat')}
            style={[
              styles.tabSelectorBtn,
              bottomTab === 'chat' && [
                styles.tabSelectorBtnActive,
                { backgroundColor: colors.surface, borderColor: colors.primary },
              ],
            ]}>
            <Text
              style={[
                styles.tabSelectorText,
                {
                  color:
                    bottomTab === 'chat' ? colors.primaryDark : colors.textMuted,
                },
              ]}>
              💬 Consultation Chat
            </Text>
          </Pressable>
        </View>

        {bottomTab === 'media' ? (
          /* Captured Media Strip */
          <View style={styles.mediaStripSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              CAPTURED EXAMINATION MEDIA ({consultation.capturedMedia?.length || 0})
            </Text>

            {consultation.capturedMedia && consultation.capturedMedia.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                {consultation.capturedMedia.map((item, idx) => (
                  <View
                    key={item.id || idx}
                    style={[styles.mediaThumb, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 24 }}>🖼️</Text>
                    <Text style={[styles.mediaThumbLabel, { color: colors.text }]}>
                      {item.label || `Snap #${idx + 1}`}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.emptyMediaBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.emptyMediaText, { color: colors.textMuted }]}>
                  No snapshots captured yet. Tap &apos;Capture Frame&apos; above during examination.
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* Consultation Chat Panel */
          <View style={{ marginBottom: Spacing.base }}>
            <ConsultationChat
              consultationId={consultation.id}
              currentUserId={currentUser?.id || 'operator-01'}
              currentUserName={currentUser?.name || 'PHC Operator'}
              currentUserRole="operator"
              isCompleted={consultation.status === 'completed'}
            />
          </View>
        )}

        {/* Examination Controls */}
        <View style={[styles.controlsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            EXAMINATION CONTROLS
          </Text>

          <View style={styles.btnGrid}>
            <View style={{ flex: 1 }}>
              <AppButton
                title="📸 Snapshot"
                onPress={handleCapture}
                variant="outline"
                size="md"
                fullWidth
              />
            </View>

            <View style={{ flex: 1 }}>
              <AppButton
                title={isRecording ? `⏹ Stop (${recordSeconds}s)` : '🎥 Record Clip'}
                onPress={handleToggleRecord}
                variant={isRecording ? 'danger' : 'outline'}
                size="md"
                fullWidth
              />
            </View>
          </View>

          {/* End Examination Action */}
          <AppButton
            title="Conclude Operator Examination"
            onPress={handleEndExamination}
            variant="danger"
            size="lg"
            fullWidth
            style={{ marginTop: Spacing.md }}
          />

          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            Note: Concluding finishes the local PHC session. Final consultation completion and prescription sign-off is completed by the ENT doctor.
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
  statusBar: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  statusBarLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  patientLabel: {
    ...Typography.subtitle,
    fontSize: 16,
  },
  doctorLabel: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  statusBarRight: {
    alignItems: 'flex-end',
  },
  viewportSection: {
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.label,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  secondaryVideoBox: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.base,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  localVideo: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.md,
    marginTop: 4,
  },
  pipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  liveText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pipContent: {
    alignItems: 'center',
    marginBottom: 4,
  },
  pipIcon: {
    fontSize: 20,
  },
  pipTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  pipSub: {
    color: '#64748B',
    fontSize: 10,
  },
  mediaStripSection: {
    marginBottom: Spacing.base,
  },
  mediaRow: {
    flexDirection: 'row',
  },
  mediaThumb: {
    width: 90,
    height: 75,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    padding: 4,
  },
  mediaThumbLabel: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyMediaBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyMediaText: {
    ...Typography.caption,
    fontSize: 12,
    textAlign: 'center',
  },
  controlsCard: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  btnGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  noticeText: {
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
    marginBottom: Spacing.md,
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
