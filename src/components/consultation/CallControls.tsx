/**
 * Teleconsultation Audio/Video Call Controls for visioENT
 *
 * Provides mic mute/unmute, video toggle, camera flip, and connection state pill.
 * Follows Phase 5 Light Clinical Theme.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { webrtcService, WebRTCConnectionState } from '@/services/webrtc/webrtcService';

interface CallControlsProps {
  onEndCall?: () => void;
  showEndCall?: boolean;
}

export function CallControls({ onEndCall, showEndCall = false }: CallControlsProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>('DISCONNECTED');

  useEffect(() => {
    const unsub = webrtcService.addStateListener((state) => {
      setConnectionState(state);
    });
    return unsub;
  }, []);

  const handleToggleMic = () => {
    const isMuted = webrtcService.toggleMuteAudio();
    setIsAudioMuted(isMuted);
  };

  const handleToggleVideo = () => {
    const isMuted = webrtcService.toggleVideo();
    setIsVideoMuted(isMuted);
  };

  const handleSwitchCamera = () => {
    webrtcService.switchCamera();
  };

  const getStatusBadge = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return { label: 'WebRTC Live', bg: colors.statusAvailableBg, text: colors.statusAvailable };
      case 'CONNECTING':
        return { label: 'Connecting...', bg: colors.statusBusyBg, text: colors.statusBusy };
      case 'RECONNECTING':
        return { label: 'Reconnecting...', bg: colors.statusBusyBg, text: colors.statusBusy };
      case 'ERROR':
        return { label: 'Call Offline', bg: colors.dangerBg, text: colors.danger };
      default:
        return { label: 'Standby', bg: colors.surfaceSecondary, text: colors.textMuted };
    }
  };

  const status = getStatusBadge();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Connection Pill */}
      <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
        <View style={[styles.dot, { backgroundColor: status.text }]} />
        <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
      </View>

      {/* Buttons */}
      <View style={styles.actionsRow}>
        {/* Mic */}
        <Pressable
          onPress={handleToggleMic}
          style={[
            styles.actionBtn,
            {
              backgroundColor: isAudioMuted ? colors.dangerBg : colors.surfaceSecondary,
              borderColor: isAudioMuted ? colors.danger : colors.border,
            },
          ]}>
          <Text style={{ fontSize: 16 }}>{isAudioMuted ? '🔇' : '🎙️'}</Text>
          <Text
            style={[
              styles.actionLabel,
              { color: isAudioMuted ? colors.danger : colors.text },
            ]}>
            {isAudioMuted ? 'Unmute' : 'Mute'}
          </Text>
        </Pressable>

        {/* Video */}
        <Pressable
          onPress={handleToggleVideo}
          style={[
            styles.actionBtn,
            {
              backgroundColor: isVideoMuted ? colors.dangerBg : colors.surfaceSecondary,
              borderColor: isVideoMuted ? colors.danger : colors.border,
            },
          ]}>
          <Text style={{ fontSize: 16 }}>{isVideoMuted ? '🚫' : '📹'}</Text>
          <Text
            style={[
              styles.actionLabel,
              { color: isVideoMuted ? colors.danger : colors.text },
            ]}>
            {isVideoMuted ? 'Start Video' : 'Stop Video'}
          </Text>
        </Pressable>

        {/* Flip Camera */}
        <Pressable
          onPress={handleSwitchCamera}
          style={[
            styles.actionBtn,
            { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
          ]}>
          <Text style={{ fontSize: 16 }}>🔄</Text>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Flip</Text>
        </Pressable>

        {/* End Call (optional) */}
        {showEndCall && onEndCall && (
          <Pressable
            onPress={onEndCall}
            style={[
              styles.actionBtn,
              { backgroundColor: colors.dangerBg, borderColor: colors.danger },
            ]}>
            <Text style={{ fontSize: 16 }}>📵</Text>
            <Text style={[styles.actionLabel, { color: colors.danger }]}>End</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  actionLabel: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
});
