/**
 * WebRTC Teleconsultation Service for visioENT
 *
 * Encapsulates RTCPeerConnection, local/remote media tracks, ICE handling,
 * audio routing, and reconnection logic.
 *
 * Works with native react-native-webrtc in development builds,
 * while safely providing graceful fallback in Expo Go preview environments.
 */

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  mediaDevices,
} from 'react-native-webrtc';

export type WebRTCConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

export type WebRTCStateListener = (state: WebRTCConnectionState, error?: string) => void;
export type StreamListener = (stream: MediaStream | null) => void;

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private connectionState: WebRTCConnectionState = 'DISCONNECTED';
  private lastError: string = '';

  private stateListeners: Set<WebRTCStateListener> = new Set();
  private localStreamListeners: Set<StreamListener> = new Set();
  private remoteStreamListeners: Set<StreamListener> = new Set();

  private isAudioMuted: boolean = false;
  private isVideoMuted: boolean = false;
  private iceRestartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.connectionState = 'DISCONNECTED';
  }

  public getConnectionState(): WebRTCConnectionState {
    return this.connectionState;
  }

  public getLastError(): string {
    return this.lastError;
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public addStateListener(listener: WebRTCStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.connectionState, this.lastError);
    return () => this.stateListeners.delete(listener);
  }

  public addLocalStreamListener(listener: StreamListener): () => void {
    this.localStreamListeners.add(listener);
    listener(this.localStream);
    return () => this.localStreamListeners.delete(listener);
  }

  public addRemoteStreamListener(listener: StreamListener): () => void {
    this.remoteStreamListeners.add(listener);
    listener(this.remoteStream);
    return () => this.remoteStreamListeners.delete(listener);
  }

  private setConnectionState(state: WebRTCConnectionState, error = '') {
    if (this.connectionState === state && this.lastError === error) return;
    this.connectionState = state;
    this.lastError = error;
    this.stateListeners.forEach((fn) => {
      try {
        fn(state, error);
      } catch (err) {
        console.warn('WebRTC state listener error:', err);
      }
    });
  }

  /**
   * Acquire local device camera & microphone.
   */
  public async startLocalMedia(options: { video?: boolean; audio?: boolean } = { video: true, audio: true }): Promise<MediaStream | null> {
    try {
      if (this.localStream) {
        return this.localStream;
      }

      if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
        console.warn('mediaDevices.getUserMedia not available in current runtime environment.');
        return null;
      }

      const stream = await mediaDevices.getUserMedia({
        video: options.video
          ? {
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 24 },
            }
          : false,
        audio: options.audio ? true : false,
      });

      this.localStream = stream;
      this.localStreamListeners.forEach((fn) => fn(stream));
      return stream;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not access device media';
      console.warn('getUserMedia error:', msg);
      return null;
    }
  }

  /**
   * Initialize RTCPeerConnection with configured ICE servers.
   */
  public initializePeerConnection(customIceServers?: { urls: string }[]): RTCPeerConnection {
    this.close();

    const configuration = {
      iceServers: customIceServers || DEFAULT_ICE_SERVERS,
    };

    const pc = new RTCPeerConnection(configuration);
    this.pc = pc;
    this.setConnectionState('CONNECTING');

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) {
          pc.addTrack(track, this.localStream);
        }
      });
    }

    // Handle incoming remote stream tracks
    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.remoteStreamListeners.forEach((fn) => fn(this.remoteStream));
      }
    };

    // Connection state listeners
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      switch (state) {
        case 'connected':
          this.clearIceRestartTimer();
          this.setConnectionState('CONNECTED');
          break;
        case 'connecting':
          this.setConnectionState('CONNECTING');
          break;
        case 'disconnected':
          this.handleNetworkDisconnection();
          break;
        case 'failed':
          this.setConnectionState('ERROR', 'WebRTC peer connection failed.');
          break;
        case 'closed':
          this.setConnectionState('DISCONNECTED');
          break;
      }
    };

    // ICE connection state listeners
    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      if (iceState === 'disconnected' || iceState === 'failed') {
        this.handleNetworkDisconnection();
      } else if (iceState === 'connected' || iceState === 'completed') {
        this.clearIceRestartTimer();
        this.setConnectionState('CONNECTED');
      }
    };

    return pc;
  }

  public getPeerConnection(): RTCPeerConnection | null {
    return this.pc;
  }

  /**
   * Create SDP Offer (Caller side).
   */
  public async createOffer(): Promise<any> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Create SDP Answer (Callee side).
   */
  public async createAnswer(): Promise<any> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Set Remote Description from signaling.
   */
  public async setRemoteDescription(desc: any): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
  }

  /**
   * Add ICE Candidate from signaling.
   */
  public async addIceCandidate(candidateData: any): Promise<void> {
    if (!this.pc) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidateData));
    } catch (err) {
      console.warn('Error adding ICE candidate:', err);
    }
  }

  /**
   * Handle temporary network interruption with ICE restart.
   */
  private handleNetworkDisconnection() {
    this.setConnectionState('RECONNECTING', 'Connection interrupted. Attempting ICE restart...');

    if (!this.iceRestartTimer) {
      this.iceRestartTimer = setTimeout(() => {
        if (this.connectionState === 'RECONNECTING') {
          this.setConnectionState('ERROR', 'Teleconsultation connection timed out.');
        }
      }, 15000); // 15 seconds grace period
    }

    try {
      if (this.pc && typeof (this.pc as any).restartIce === 'function') {
        (this.pc as any).restartIce();
      }
    } catch (e) {
      console.warn('ICE restart trigger error:', e);
    }
  }

  private clearIceRestartTimer() {
    if (this.iceRestartTimer) {
      clearTimeout(this.iceRestartTimer);
      this.iceRestartTimer = null;
    }
  }

  /**
   * Toggle local microphone mute.
   */
  public toggleMuteAudio(): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    this.isAudioMuted = !this.isAudioMuted;
    audioTracks.forEach((track) => {
      track.enabled = !this.isAudioMuted;
    });

    return this.isAudioMuted;
  }

  /**
   * Toggle local camera video on/off.
   */
  public toggleVideo(): boolean {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;

    this.isVideoMuted = !this.isVideoMuted;
    videoTracks.forEach((track) => {
      track.enabled = !this.isVideoMuted;
    });

    return this.isVideoMuted;
  }

  /**
   * Switch between front and back camera where supported.
   */
  public async switchCamera(): Promise<void> {
    if (!this.localStream) return;
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length > 0 && typeof (videoTracks[0] as any)._switchCamera === 'function') {
      try {
        (videoTracks[0] as any)._switchCamera();
      } catch (err) {
        console.warn('Camera switch error:', err);
      }
    }
  }

  /**
   * Complete teardown and resource release.
   */
  public close(): void {
    this.clearIceRestartTimer();

    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }

    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.localStream = null;
      this.localStreamListeners.forEach((fn) => fn(null));
    }

    this.remoteStream = null;
    this.remoteStreamListeners.forEach((fn) => fn(null));

    this.isAudioMuted = false;
    this.isVideoMuted = false;
    this.setConnectionState('DISCONNECTED');
  }
}

export const webrtcService = new WebRTCService();
