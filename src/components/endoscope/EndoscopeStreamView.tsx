/**
 * Reusable Endoscope Camera Streaming View for SMART ENT ENDOSCOPE
 *
 * Consumes ESP32-S3 / OV5640 WebView MJPEG stream via cameraService.
 * Implements 5-state connection machine (DISCONNECTED, CONNECTING, CONNECTED, RECONNECTING, ERROR)
 * and strict WebView lifecycle teardown on unmount or mode switch to prevent background data leakage.
 *
 * NOTE ON STREAM FREEZE DETECTION:
 * STREAM FREEZE DETECTION LIMITED: Chromium's HTML parser treats multipart/x-mixed-replace
 * as a single long-lived image request; standard DOM <img> onload is fired once upon receipt
 * of the initial part header. Unless a custom native reader is used, standard DOM <img> elements
 * do not trigger DOM events on individual MJPEG frame boundaries. A manual reload trigger is provided.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  useColorScheme,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import {
  cameraService,
  CameraConnectionState,
  STREAM_URL,
} from '@/services/camera/cameraService';

interface EndoscopeStreamViewProps {
  onCaptureFrame?: () => void;
  showControls?: boolean;
  aspectRatio?: number;
  height?: number;
}

export function EndoscopeStreamView({
  onCaptureFrame,
  showControls = true,
  height,
}: EndoscopeStreamViewProps) {
  const [mode, setMode] = useState<'live' | 'mock'>('mock'); // Default mock for testability without hardware
  const [connectionState, setConnectionState] = useState<CameraConnectionState>('DISCONNECTED');
  const [streamKey, setStreamKey] = useState(1);
  const webViewRef = useRef<WebView>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // Clear watchdog timer
  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

  // Update both local state and cameraService state
  const handleStateChange = useCallback((newState: CameraConnectionState, errorMsg?: string) => {
    setConnectionState(newState);
    cameraService.setConnectionState(newState, errorMsg);
  }, []);

  // Mode selection handler
  const handleSelectMode = (newMode: 'live' | 'mock') => {
    setMode(newMode);
    clearConnectTimeout();

    if (newMode === 'live') {
      handleStateChange('CONNECTING');
      connectTimeoutRef.current = setTimeout(() => {
        setConnectionState((curr) => {
          if (curr === 'CONNECTING') {
            cameraService.setConnectionState('ERROR', 'Connection timed out. Ensure device is on ESP32 Wi-Fi.');
            return 'ERROR';
          }
          return curr;
        });
      }, 8000);
    } else {
      handleStateChange('DISCONNECTED');
    }
  };

  const heartbeatFailuresRef = useRef(0);

  // Heartbeat watchdog while connected in live mode
  useEffect(() => {
    if (mode !== 'live' || connectionState !== 'CONNECTED') {
      heartbeatFailuresRef.current = 0;
      return;
    }

    const interval = setInterval(async () => {
      const isAlive = await cameraService.checkHealth(2000);
      if (!isAlive) {
        heartbeatFailuresRef.current += 1;
        if (heartbeatFailuresRef.current >= 2) {
          handleStateChange('ERROR', 'ESP32 connection lost. Stream stopped.');
        }
      } else {
        heartbeatFailuresRef.current = 0;
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [mode, connectionState, handleStateChange]);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      clearConnectTimeout();
      cameraService.disconnect();
    };
  }, [clearConnectTimeout]);

  const handleReloadStream = () => {
    clearConnectTimeout();
    handleStateChange('RECONNECTING');
    setStreamKey((prev) => prev + 1);

    connectTimeoutRef.current = setTimeout(() => {
      setConnectionState((curr) => {
        if (curr === 'RECONNECTING' || curr === 'CONNECTING') {
          cameraService.setConnectionState('ERROR', 'Reconnect attempt failed.');
          return 'ERROR';
        }
        return curr;
      });
    }, 6000);
  };

  // Exact HTML stream used in the original prototype with robust messaging
  const cameraHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta
          name="viewport"
          content="width=device-width,
          initial-scale=1.0,
          maximum-scale=1.0,
          user-scalable=no"
        />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: 100%;
            height: 100%;
            background: #000000;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }
        </style>
      </head>
      <body>
        <img
          src="${STREAM_URL}?t=${streamKey}"
          onload="window.ReactNativeWebView.postMessage('connected')"
          onerror="window.ReactNativeWebView.postMessage('error')"
        />
        <script>
          window.addEventListener('offline', function() {
            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('error');
          });
          window.addEventListener('error', function() {
            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('error');
          });
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    const message = event.nativeEvent.data;
    if (message === 'connected') {
      clearConnectTimeout();
      handleStateChange('CONNECTED');
    }
    if (message === 'error') {
      clearConnectTimeout();
      handleStateChange('ERROR', 'ESP32 stream returned error');
    }
  };

  const getStatusColor = () => {
    if (mode === 'mock') return '#008C95';
    switch (connectionState) {
      case 'CONNECTED':
        return '#22C55E';
      case 'CONNECTING':
        return '#F59E0B';
      case 'RECONNECTING':
        return '#F97316';
      case 'ERROR':
        return '#EF4444';
      case 'DISCONNECTED':
      default:
        return '#94A3B8';
    }
  };

  const getStatusLabel = () => {
    if (mode === 'mock') return 'MOCK ENDOSCOPE FEED';
    switch (connectionState) {
      case 'CONNECTED':
        return 'ESP32 LIVE (192.168.4.1)';
      case 'CONNECTING':
        return 'CONNECTING TO ESP32...';
      case 'RECONNECTING':
        return 'RECONNECTING FEED...';
      case 'ERROR':
        return 'ESP32 OFFLINE';
      case 'DISCONNECTED':
      default:
        return 'ESP32 STANDBY';
    }
  };

  return (
    <View style={[styles.container, height ? { height } : styles.defaultHeight]}>
      {/* Viewport Box */}
      <View style={styles.viewport}>
        {mode === 'live' ? (
          <>
            <WebView
              key={`stream-${streamKey}`}
              ref={webViewRef}
              source={{ html: cameraHTML }}
              style={styles.webview}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              mixedContentMode="always"
              cacheEnabled={false}
              onMessage={handleMessage}
              onLoadStart={() => {
                if (connectionState !== 'CONNECTED') {
                  handleStateChange('CONNECTING');
                }
              }}
              onError={() => {
                clearConnectTimeout();
                handleStateChange('ERROR', 'WebView network error');
              }}
              scrollEnabled={false}
              bounces={false}
            />

            {(connectionState === 'CONNECTING' || connectionState === 'RECONNECTING') && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>
                  {connectionState === 'RECONNECTING' ? 'Reconnecting to ESP32...' : 'Connecting to ESP32...'}
                </Text>
                <Text style={styles.ipLoading}>192.168.4.1/stream</Text>
              </View>
            )}

            {connectionState === 'ERROR' && (
              <View style={styles.errorOverlay}>
                <Text style={styles.errorTitle}>ESP32 Stream Unavailable</Text>
                <Text style={styles.errorSub}>
                  Ensure phone is connected to ESP32 Wi-Fi (192.168.4.1).
                </Text>
                <Pressable onPress={handleReloadStream} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>↺ Retry Connection</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          /* Mock Simulated Endoscope Viewport */
          <View style={styles.mockStreamBox}>
            <View style={styles.reticle}>
              <View style={styles.crosshairH} />
              <View style={styles.crosshairV} />
              <View style={styles.innerCircle} />
            </View>

            <Text style={styles.mockStreamText}>
              SIMULATED ENDOSCOPE FEED
            </Text>
            <Text style={styles.mockStreamSub}>
              HD 1080p • 30 FPS • Illumination LED 85%
            </Text>
            <Text style={styles.mockStreamHint}>
              (Toggle to &apos;ESP32 Live&apos; when connected to ESP32-S3 SoftAP)
            </Text>
          </View>
        )}

        {/* Top Status Overlay Bar */}
        <View style={styles.overlayTopBar}>
          <View style={styles.feedLabelBox}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.feedLabel}>{getStatusLabel()}</Text>
          </View>

          <View style={styles.rightOverlayGroup}>
            {mode === 'live' && connectionState === 'CONNECTED' && (
              <Pressable onPress={handleReloadStream} style={styles.miniRefreshBtn}>
                <Text style={styles.miniRefreshText}>↺ Refresh</Text>
              </Pressable>
            )}
            <Text style={styles.streamInfo}>
              {mode === 'live' ? 'OV5640 MJPEG' : 'TEST STREAM'}
            </Text>
          </View>
        </View>
      </View>

      {/* Control Bar */}
      {showControls && (
        <View style={[styles.controlBar, { backgroundColor: colors.surface }]}>
          {/* Stream Source Toggle */}
          <View style={styles.modeToggleGroup}>
            <Pressable
              onPress={() => handleSelectMode('mock')}
              style={[
                styles.modeBtn,
                mode === 'mock' && { backgroundColor: colors.primaryLight },
              ]}>
              <Text
                style={[
                  styles.modeBtnText,
                  { color: mode === 'mock' ? colors.primaryDark : colors.textSecondary },
                ]}>
                Simulated
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSelectMode('live')}
              style={[
                styles.modeBtn,
                mode === 'live' && { backgroundColor: colors.primaryLight },
              ]}>
              <Text
                style={[
                  styles.modeBtnText,
                  { color: mode === 'live' ? colors.primaryDark : colors.textSecondary },
                ]}>
                ESP32 Live
              </Text>
            </Pressable>
          </View>

          {/* Quick Capture Button */}
          {onCaptureFrame && (
            <Pressable
              onPress={onCaptureFrame}
              style={({ pressed }) => [
                styles.captureBtn,
                { opacity: pressed ? 0.75 : 1 },
              ]}>
              <Text style={styles.captureBtnText}>📸 Capture Frame</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  defaultHeight: {
    height: 280,
  },
  viewport: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  ipLoading: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 14, 23, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.base,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorSub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  retryBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  mockStreamBox: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0E17',
  },
  reticle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  crosshairH: {
    position: 'absolute',
    width: 160,
    height: 1,
    backgroundColor: 'rgba(0, 140, 149, 0.3)',
  },
  crosshairV: {
    position: 'absolute',
    width: 1,
    height: 160,
    backgroundColor: 'rgba(0, 140, 149, 0.3)',
  },
  innerCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 140, 149, 0.6)',
  },
  mockStreamText: {
    color: '#008C95',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  mockStreamSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  mockStreamHint: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 6,
  },
  overlayTopBar: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  feedLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  rightOverlayGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniRefreshBtn: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  miniRefreshText: {
    color: '#008C95',
    fontSize: 10,
    fontWeight: '600',
  },
  streamInfo: {
    color: '#94A3B8',
    fontSize: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  controlBar: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: BorderRadius.md,
    padding: 2,
  },
  modeBtn: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.md - 2,
  },
  modeBtnText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  captureBtn: {
    backgroundColor: '#008C95',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  captureBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
