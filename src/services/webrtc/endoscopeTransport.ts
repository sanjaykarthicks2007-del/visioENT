/**
 * Endoscope Remote Transport Abstraction for visioENT
 *
 * Transports optical JPEG examination frames from the Operator device
 * (which fetches them from local ESP32 SoftAP http://192.168.4.1/stream)
 * to the remote Doctor device over WebRTC RTCDataChannel.
 *
 * Implements:
 * - Backpressure control: drops stale frames when bufferedAmount > 64KB
 * - Real-time metrics: measures actual FPS, frame latency (ms), and frame drops
 * - Replaceable interface: allows switching to native VideoTrack in future phases
 */

import { RTCPeerConnection } from 'react-native-webrtc';

type RTCDataChannel = ReturnType<RTCPeerConnection['createDataChannel']>;

export interface EndoscopeTransportStats {
  fps: number;
  latencyMs: number;
  droppedFrames: number;
  totalFrames: number;
  totalBytes: number;
  channelState: string;
}

export type FrameReceivedListener = (frameDataUri: string, latencyMs: number) => void;

class EndoscopeRemoteTransport {
  private dataChannel: RTCDataChannel | null = null;
  private frameListeners: Set<FrameReceivedListener> = new Set();

  // Metrics tracking
  private frameTimestamps: number[] = [];
  private lastLatencyMs: number = 0;
  private droppedFrames: number = 0;
  private totalFrames: number = 0;
  private totalBytes: number = 0;
  private currentFps: number = 0;
  private fpsInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startFpsSampler();
  }

  public onFrameReceived(listener: FrameReceivedListener): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  /**
   * Initialize DataChannel on the active PeerConnection.
   */
  public connect(pc: RTCPeerConnection, isInitiator: boolean): void {
    this.disconnect();

    if (isInitiator) {
      // Operator: Create outgoing DataChannel for endoscope frame transport
      try {
        const dc = pc.createDataChannel('endoscope_optical_stream', {
          ordered: false, // Low latency: drop rather than delay
          maxRetransmits: 0,
        });
        this.setupDataChannel(dc);
      } catch (err) {
        console.warn('Failed to create endoscope DataChannel:', err);
      }
    } else {
      // Doctor: Listen for incoming DataChannel
      pc.ondatachannel = (event: { channel: RTCDataChannel }) => {
        if (event.channel && event.channel.label === 'endoscope_optical_stream') {
          this.setupDataChannel(event.channel);
        }
      };
    }
  }

  private setupDataChannel(dc: RTCDataChannel) {
    this.dataChannel = dc;

    dc.onopen = () => {
      // DataChannel opened
    };

    dc.onclose = () => {
      // DataChannel closed
    };

    dc.onerror = (err: unknown) => {
      console.warn('Endoscope DataChannel error:', err);
    };

    dc.onmessage = (event: { data: any }) => {
      try {
        if (typeof event.data === 'string') {
          const payload = JSON.parse(event.data);
          if (payload && payload.f) {
            const now = Date.now();
            if (payload.t) {
              this.lastLatencyMs = Math.max(0, now - payload.t);
            }
            this.totalFrames++;
            this.totalBytes += event.data.length;
            this.frameTimestamps.push(now);

            this.frameListeners.forEach((fn) => {
              try {
                fn(payload.f, this.lastLatencyMs);
              } catch (err) {
                console.warn('Frame receive listener error:', err);
              }
            });
          }
        }
      } catch {
        // Raw string frame fallback
        if (typeof event.data === 'string' && event.data.startsWith('data:image/')) {
          this.frameListeners.forEach((fn) => fn(event.data, 0));
        }
      }
    };
  }

  /**
   * Relay a frame to the remote party.
   * If the DataChannel buffer has backpressure (> 64KB), drops the frame
   * to guarantee live zero-delay optical viewing rather than lagging behind.
   */
  public sendFrame(frameDataUri: string): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return false;
    }

    // Backpressure safeguard: Drop frame if previous frames are still buffered
    if (this.dataChannel.bufferedAmount && this.dataChannel.bufferedAmount > 65536) {
      this.droppedFrames++;
      return false;
    }

    try {
      const payload = JSON.stringify({
        t: Date.now(),
        f: frameDataUri,
      });

      this.dataChannel.send(payload);
      this.totalFrames++;
      this.totalBytes += payload.length;
      return true;
    } catch {
      this.droppedFrames++;
      return false;
    }
  }

  public getStats(): EndoscopeTransportStats {
    return {
      fps: this.currentFps,
      latencyMs: this.lastLatencyMs,
      droppedFrames: this.droppedFrames,
      totalFrames: this.totalFrames,
      totalBytes: this.totalBytes,
      channelState: this.dataChannel?.readyState || 'disconnected',
    };
  }

  private startFpsSampler() {
    this.fpsInterval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - 1000;
      this.frameTimestamps = this.frameTimestamps.filter((t) => t >= cutoff);
      this.currentFps = this.frameTimestamps.length;
    }, 1000);
  }

  public disconnect(): void {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {}
      this.dataChannel = null;
    }
    this.frameTimestamps = [];
    this.currentFps = 0;
  }
}

export const endoscopeTransport = new EndoscopeRemoteTransport();
