/**
 * Endoscope Camera Service for SMART ENT ENDOSCOPE
 *
 * Encapsulates communication with the ESP32-S3 / Waveshare OV5640 5MP hardware.
 * Manages endpoints, connection state, lightweight health checks,
 * and binary snapshot acquisition from http://192.168.4.1/capture.
 *
 * DO NOT couple this service directly to Firebase or Firestore.
 */

export type CameraConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

export interface CapturedFrameResult {
  success: boolean;
  uri?: string; // Standard base64 data URI: data:image/jpeg;base64,...
  byteSize?: number;
  mimeType?: string;
  error?: string;
}

export interface CameraStatus {
  state: CameraConnectionState;
  baseUrl: string;
  streamUrl: string;
  isReachable: boolean;
  lastCheckedAt?: string;
  error?: string;
}

// Fixed ESP32 SoftAP hardware address
export const ESP32_BASE_URL = 'http://192.168.4.1';
export const STREAM_URL = `${ESP32_BASE_URL}/stream`;
export const CAPTURE_URL = `${ESP32_BASE_URL}/capture`;

type StatusListener = (status: CameraStatus) => void;

class CameraService {
  private state: CameraConnectionState = 'DISCONNECTED';
  private lastError: string | undefined = undefined;
  private lastCheckedAt: string | undefined = undefined;
  private isReachable = false;
  private listeners: Set<StatusListener> = new Set();

  /**
   * Returns the base IP URL for the ESP32 hardware
   */
  public getBaseUrl(): string {
    return ESP32_BASE_URL;
  }

  /**
   * Returns the live MJPEG stream URL
   */
  public getStreamUrl(): string {
    return STREAM_URL;
  }

  /**
   * Returns the single snapshot capture URL
   */
  public getCaptureUrl(): string {
    return CAPTURE_URL;
  }

  /**
   * Returns current connection state
   */
  public getConnectionState(): CameraConnectionState {
    return this.state;
  }

  /**
   * Returns complete current status snapshot
   */
  public getStatus(): CameraStatus {
    return {
      state: this.state,
      baseUrl: ESP32_BASE_URL,
      streamUrl: STREAM_URL,
      isReachable: this.isReachable,
      lastCheckedAt: this.lastCheckedAt,
      error: this.lastError,
    };
  }

  /**
   * Updates internal connection state and notifies all subscribers
   */
  public setConnectionState(newState: CameraConnectionState, error?: string): void {
    if (this.state === newState && this.lastError === error) {
      return;
    }
    this.state = newState;
    this.lastError = error;
    if (newState === 'CONNECTED') {
      this.isReachable = true;
    } else if (newState === 'ERROR' || newState === 'DISCONNECTED') {
      this.isReachable = false;
    }
    this.notifyListeners();
  }

  /**
   * Subscribes to real-time camera status updates
   */
  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.warn('[CameraService] Subscriber error:', err);
      }
    });
  }

  /**
   * Performs a lightweight HTTP health check to probe ESP32 reachability.
   * Uses AbortController with a short 2500ms timeout to avoid hanging the UI.
   */
  public async checkHealth(timeoutMs = 2500): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Probe root gateway endpoint
      const response = await fetch(ESP32_BASE_URL, {
        method: 'GET',
        signal: controller.signal,
      });

      this.lastCheckedAt = new Date().toISOString();
      this.isReachable = response.ok || response.status < 500;
      return this.isReachable;
    } catch {
      this.isReachable = false;
      this.lastCheckedAt = new Date().toISOString();
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Converts an ArrayBuffer to a Base64 string in chunks to prevent call-stack overflow.
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }

  /**
   * Captures a single JPEG frame from http://192.168.4.1/capture.
   *
   * Validates HTTP status and response buffer.
   * Converts binary JPEG to a standard base64 data URI ('data:image/jpeg;base64,...').
   * Never throws; returns a structured result.
   */
  public async captureFrame(timeoutMs = 3500): Promise<CapturedFrameResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(CAPTURE_URL, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `ESP32 returned HTTP status ${response.status} (${response.statusText || 'Capture Error'}).`,
        };
      }

      const buffer = await response.arrayBuffer();
      if (!buffer || buffer.byteLength === 0) {
        return {
          success: false,
          error: 'Received empty frame buffer from ESP32 camera.',
        };
      }

      const base64Data = this.arrayBufferToBase64(buffer);
      const dataUri = `data:image/jpeg;base64,${base64Data}`;

      return {
        success: true,
        uri: dataUri,
        byteSize: buffer.byteLength,
        mimeType: 'image/jpeg',
      };
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const errorMessage = isAbort
        ? `Capture request timed out after ${timeoutMs}ms. Verify ESP32 Wi-Fi connection.`
        : err instanceof Error
        ? err.message
        : 'Network connection failure while fetching frame from ESP32.';

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Gracefully tears down connection state
   */
  public disconnect(): void {
    this.setConnectionState('DISCONNECTED');
  }
}

export const cameraService = new CameraService();
