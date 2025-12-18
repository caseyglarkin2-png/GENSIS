/**
 * Hardware Handshake Layer
 * 
 * Industrial hardware integration specifications for FreightRoll platform:
 * - Global Shutter camera integration (Axis Q1700-LE, Avigilon H6A)
 * - High-Nit (1500+) outdoor display protocols
 * - Resistive touchscreen compatibility for gloved operation
 * - Industrial kiosk configuration
 */

// ============================================================================
// Camera Types & Configurations
// ============================================================================

export interface CameraCapabilities {
  shutterType: 'global' | 'rolling';
  resolution: { width: number; height: number };
  frameRate: number;
  lowLightCapable: boolean;
  weatherRating: 'IP66' | 'IP67' | 'NEMA4X';
  operatingTempRange: { min: number; max: number }; // Celsius
  licensePlateReadingRange: { min: number; max: number }; // meters
  builtInIlluminator: boolean;
  streamFormats: ('h264' | 'h265' | 'mjpeg')[];
}

export interface GlobalShutterConfig {
  /**
   * Global Shutter cameras capture entire frame simultaneously,
   * eliminating rolling shutter distortion on moving trucks.
   * Critical for LPR (License Plate Recognition) at speed.
   */
  exposureMode: 'auto' | 'manual' | 'flicker-free';
  exposureTimeUs: number; // microseconds
  gainDb: number; // decibels
  whiteBalance: 'auto' | 'daylight' | 'tungsten' | 'fluorescent';
  
  // LPR-specific settings
  lprMode: boolean;
  lprRegion: 'north_america' | 'europe' | 'asia';
  captureOnMotion: boolean;
  preBufferFrames: number;
  postBufferFrames: number;
  
  // Network settings
  streamProtocol: 'rtsp' | 'onvif' | 'axis_vapor';
  compressionQuality: number; // 0-100
  bitrateMbps: number;
}

export interface CameraStreamConfig {
  cameraId: string;
  endpoint: string; // RTSP/ONVIF URL
  protocol: 'rtsp' | 'onvif' | 'http' | 'mqtt';
  authentication: {
    type: 'basic' | 'digest' | 'token';
    credentials?: {
      username: string;
      password: string;
    };
    token?: string;
  };
  streamSettings: GlobalShutterConfig;
}

/**
 * Supported Industrial Camera Models
 */
export const SUPPORTED_CAMERAS: Record<string, CameraCapabilities> = {
  'axis_q1700_le': {
    shutterType: 'global',
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    lowLightCapable: true,
    weatherRating: 'IP67',
    operatingTempRange: { min: -40, max: 60 },
    licensePlateReadingRange: { min: 2, max: 50 },
    builtInIlluminator: true,
    streamFormats: ['h264', 'h265', 'mjpeg'],
  },
  'avigilon_h6a_lpr': {
    shutterType: 'global',
    resolution: { width: 3840, height: 2160 },
    frameRate: 30,
    lowLightCapable: true,
    weatherRating: 'IP67',
    operatingTempRange: { min: -40, max: 50 },
    licensePlateReadingRange: { min: 3, max: 75 },
    builtInIlluminator: true,
    streamFormats: ['h264', 'h265'],
  },
  'hikvision_ids_tcm403_lpr': {
    shutterType: 'global',
    resolution: { width: 2688, height: 1520 },
    frameRate: 25,
    lowLightCapable: true,
    weatherRating: 'IP67',
    operatingTempRange: { min: -40, max: 65 },
    licensePlateReadingRange: { min: 3, max: 35 },
    builtInIlluminator: true,
    streamFormats: ['h264', 'h265'],
  },
  'bosch_dinion_7100i_ir': {
    shutterType: 'global',
    resolution: { width: 3840, height: 2160 },
    frameRate: 30,
    lowLightCapable: true,
    weatherRating: 'IP66',
    operatingTempRange: { min: -40, max: 55 },
    licensePlateReadingRange: { min: 5, max: 60 },
    builtInIlluminator: true,
    streamFormats: ['h264', 'h265', 'mjpeg'],
  },
};

// ============================================================================
// Display Types & Configurations
// ============================================================================

export interface DisplayCapabilities {
  nits: number; // brightness (outdoor requires 1500+)
  type: 'lcd' | 'led' | 'oled';
  resolution: { width: number; height: number };
  touchType: 'resistive' | 'capacitive' | 'pcap' | 'saw';
  weatherRating: 'IP54' | 'IP65' | 'IP66' | 'NEMA4X';
  operatingTempRange: { min: number; max: number };
  gloveCompatible: boolean;
  antiGlare: boolean;
  vandalResistant: boolean;
}

export interface HighNitDisplayConfig {
  /**
   * High-Nit displays (1500+ nits) for outdoor sunlight readability.
   * Combined with resistive touch for gloved driver operation.
   */
  brightnessMode: 'auto' | 'manual' | 'scheduled';
  brightnessPercent: number; // 0-100
  autoSensorEnabled: boolean;
  nightModeEnabled: boolean;
  nightModeBrightnessPercent: number;
  
  // Touch configuration
  touchSensitivity: 'high' | 'medium' | 'low'; // low = better for gloves
  touchCalibration: {
    topLeftOffset: { x: number; y: number };
    bottomRightOffset: { x: number; y: number };
  };
  multiTouchEnabled: boolean;
  palmRejection: boolean;
  
  // Power management
  sleepTimeoutMinutes: number;
  wakeOnTouch: boolean;
  screenSaverEnabled: boolean;
}

/**
 * Supported Outdoor Kiosk Displays
 */
export const SUPPORTED_DISPLAYS: Record<string, DisplayCapabilities> = {
  'elo_4303l_outdoor': {
    nits: 2500,
    type: 'lcd',
    resolution: { width: 1920, height: 1080 },
    touchType: 'pcap',
    weatherRating: 'IP66',
    operatingTempRange: { min: -30, max: 60 },
    gloveCompatible: true,
    antiGlare: true,
    vandalResistant: true,
  },
  'advantech_utc_520e': {
    nits: 2000,
    type: 'lcd',
    resolution: { width: 1920, height: 1080 },
    touchType: 'resistive',
    weatherRating: 'IP65',
    operatingTempRange: { min: -20, max: 55 },
    gloveCompatible: true,
    antiGlare: true,
    vandalResistant: true,
  },
  'arista_sunlight_readable_23': {
    nits: 1800,
    type: 'lcd',
    resolution: { width: 1920, height: 1080 },
    touchType: 'resistive',
    weatherRating: 'IP65',
    operatingTempRange: { min: -30, max: 70 },
    gloveCompatible: true,
    antiGlare: true,
    vandalResistant: true,
  },
};

// ============================================================================
// Kiosk Configuration
// ============================================================================

export interface KioskConfig {
  id: string;
  name: string;
  location: 'gate_entry' | 'gate_exit' | 'dock_check_in' | 'yard_station';
  
  // Hardware
  displayModel: keyof typeof SUPPORTED_DISPLAYS;
  displayConfig: HighNitDisplayConfig;
  cameraModel: keyof typeof SUPPORTED_CAMERAS | null;
  cameraConfig: CameraStreamConfig | null;
  
  // Network
  networkConfig: {
    ipAddress: string;
    subnetMask: string;
    gateway: string;
    primaryDns: string;
    secondaryDns?: string;
    vlanId?: number;
  };
  
  // Operation
  operatingHours: {
    start: string; // HH:MM
    end: string;
    timezone: string;
  };
  maintenanceWindow: {
    dayOfWeek: number; // 0-6
    hour: number; // 0-23
    durationMinutes: number;
  };
}

// ============================================================================
// Image Buffer Processing for Global Shutter
// ============================================================================

export interface ImageBuffer {
  width: number;
  height: number;
  channels: 3 | 4; // RGB or RGBA
  data: Uint8Array;
  timestamp: number;
  frameNumber: number;
  exposureUs: number;
  globalShutter: boolean;
}

export interface LPRResult {
  plateText: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  plateRegion: string;
  vehicleType?: 'truck' | 'trailer' | 'car' | 'unknown';
  timestamp: number;
}

/**
 * Global Shutter Image Processor
 * Handles image buffers from Global Shutter cameras,
 * preventing motion blur artifacts that plague rolling shutter sensors.
 */
export class GlobalShutterProcessor {
  private bufferQueue: ImageBuffer[] = [];
  private maxQueueSize: number;
  private processingInterval: number;
  
  constructor(maxQueueSize = 30, processingIntervalMs = 33) {
    this.maxQueueSize = maxQueueSize;
    this.processingInterval = processingIntervalMs;
  }
  
  /**
   * Ingest raw frame from Global Shutter camera
   */
  ingestFrame(buffer: ImageBuffer): void {
    // Verify global shutter (no need for motion deblur)
    if (!buffer.globalShutter) {
      console.warn('Frame not from global shutter camera - motion artifacts may occur');
    }
    
    // Queue management
    if (this.bufferQueue.length >= this.maxQueueSize) {
      this.bufferQueue.shift(); // Remove oldest
    }
    
    this.bufferQueue.push(buffer);
  }
  
  /**
   * Get frames within time window
   */
  getFramesInWindow(startMs: number, endMs: number): ImageBuffer[] {
    return this.bufferQueue.filter(
      f => f.timestamp >= startMs && f.timestamp <= endMs
    );
  }
  
  /**
   * Clear buffer
   */
  clearBuffer(): void {
    this.bufferQueue = [];
  }
  
  /**
   * Get buffer status
   */
  getStatus(): { queueLength: number; oldestFrame: number; newestFrame: number } {
    return {
      queueLength: this.bufferQueue.length,
      oldestFrame: this.bufferQueue[0]?.timestamp ?? 0,
      newestFrame: this.bufferQueue[this.bufferQueue.length - 1]?.timestamp ?? 0,
    };
  }
  
  /**
   * Extract best frame for LPR (clearest, sharpest)
   */
  extractBestLPRFrame(vehiclePassStartMs: number, vehiclePassEndMs: number): ImageBuffer | null {
    const frames = this.getFramesInWindow(vehiclePassStartMs, vehiclePassEndMs);
    
    if (frames.length === 0) return null;
    
    // For global shutter, all frames are equally sharp
    // Select middle frame for best plate visibility
    const middleIndex = Math.floor(frames.length / 2);
    return frames[middleIndex];
  }
}

// ============================================================================
// Camera Integration Service
// ============================================================================

export interface CameraEvent {
  type: 'motion_detected' | 'vehicle_entered' | 'vehicle_exited' | 'lpr_read' | 'error';
  cameraId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export type CameraEventHandler = (event: CameraEvent) => void;

export class CameraIntegrationService {
  private cameras: Map<string, CameraStreamConfig> = new Map();
  private processors: Map<string, GlobalShutterProcessor> = new Map();
  private eventHandlers: CameraEventHandler[] = [];
  private isRunning = false;
  
  /**
   * Register a camera
   */
  registerCamera(config: CameraStreamConfig): void {
    this.cameras.set(config.cameraId, config);
    this.processors.set(config.cameraId, new GlobalShutterProcessor());
  }
  
  /**
   * Unregister a camera
   */
  unregisterCamera(cameraId: string): void {
    this.cameras.delete(cameraId);
    this.processors.get(cameraId)?.clearBuffer();
    this.processors.delete(cameraId);
  }
  
  /**
   * Subscribe to camera events
   */
  onEvent(handler: CameraEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
    };
  }
  
  /**
   * Emit event to all handlers
   */
  private emitEvent(event: CameraEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Camera event handler error:', error);
      }
    }
  }
  
  /**
   * Process incoming frame
   */
  processFrame(cameraId: string, buffer: ImageBuffer): void {
    const processor = this.processors.get(cameraId);
    if (!processor) {
      console.warn(`No processor for camera ${cameraId}`);
      return;
    }
    
    processor.ingestFrame(buffer);
  }
  
  /**
   * Get optimal frame for LPR
   */
  getOptimalLPRFrame(cameraId: string, startMs: number, endMs: number): ImageBuffer | null {
    const processor = this.processors.get(cameraId);
    if (!processor) return null;
    
    return processor.extractBestLPRFrame(startMs, endMs);
  }
  
  /**
   * Start all camera streams
   */
  start(): void {
    this.isRunning = true;
    console.log(`CameraIntegrationService started with ${this.cameras.size} cameras`);
  }
  
  /**
   * Stop all camera streams
   */
  stop(): void {
    this.isRunning = false;
    for (const processor of this.processors.values()) {
      processor.clearBuffer();
    }
    console.log('CameraIntegrationService stopped');
  }
  
  /**
   * Get status of all cameras
   */
  getStatus(): Record<string, { config: CameraStreamConfig; bufferStatus: ReturnType<GlobalShutterProcessor['getStatus']> }> {
    const status: Record<string, { config: CameraStreamConfig; bufferStatus: ReturnType<GlobalShutterProcessor['getStatus']> }> = {};
    
    for (const [id, config] of this.cameras) {
      const processor = this.processors.get(id);
      status[id] = {
        config,
        bufferStatus: processor?.getStatus() ?? { queueLength: 0, oldestFrame: 0, newestFrame: 0 },
      };
    }
    
    return status;
  }
}

// ============================================================================
// Display Integration Service
// ============================================================================

export interface DisplayState {
  kioskId: string;
  brightness: number;
  touchCalibrated: boolean;
  lastActivity: number;
  isAwake: boolean;
  currentScreen: string;
  errors: string[];
}

export class DisplayIntegrationService {
  private kiosks: Map<string, KioskConfig> = new Map();
  private states: Map<string, DisplayState> = new Map();
  
  /**
   * Register a kiosk display
   */
  registerKiosk(config: KioskConfig): void {
    this.kiosks.set(config.id, config);
    this.states.set(config.id, {
      kioskId: config.id,
      brightness: config.displayConfig.brightnessPercent,
      touchCalibrated: true,
      lastActivity: Date.now(),
      isAwake: true,
      currentScreen: 'home',
      errors: [],
    });
  }
  
  /**
   * Set display brightness
   */
  setBrightness(kioskId: string, percent: number): void {
    const state = this.states.get(kioskId);
    if (state) {
      state.brightness = Math.max(0, Math.min(100, percent));
    }
  }
  
  /**
   * Auto-adjust brightness based on ambient light
   */
  autoAdjustBrightness(kioskId: string, ambientLux: number): void {
    const config = this.kiosks.get(kioskId);
    if (!config?.displayConfig.autoSensorEnabled) return;
    
    // Brightness curve for outdoor displays
    // 0-1000 lux: 30-50% brightness
    // 1000-10000 lux: 50-80% brightness
    // 10000+ lux (direct sun): 80-100% brightness
    let targetBrightness: number;
    
    if (ambientLux < 1000) {
      targetBrightness = 30 + (ambientLux / 1000) * 20;
    } else if (ambientLux < 10000) {
      targetBrightness = 50 + ((ambientLux - 1000) / 9000) * 30;
    } else {
      targetBrightness = 80 + Math.min(20, (ambientLux - 10000) / 5000 * 20);
    }
    
    this.setBrightness(kioskId, targetBrightness);
  }
  
  /**
   * Wake display
   */
  wakeDisplay(kioskId: string): void {
    const state = this.states.get(kioskId);
    if (state) {
      state.isAwake = true;
      state.lastActivity = Date.now();
    }
  }
  
  /**
   * Put display to sleep
   */
  sleepDisplay(kioskId: string): void {
    const state = this.states.get(kioskId);
    if (state) {
      state.isAwake = false;
    }
  }
  
  /**
   * Get display state
   */
  getState(kioskId: string): DisplayState | undefined {
    return this.states.get(kioskId);
  }
  
  /**
   * Get all kiosk states
   */
  getAllStates(): DisplayState[] {
    return Array.from(this.states.values());
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create default camera config for gate entry
 */
export function createGateEntryCameraConfig(
  cameraId: string,
  endpoint: string,
  model: keyof typeof SUPPORTED_CAMERAS = 'axis_q1700_le'
): CameraStreamConfig {
  return {
    cameraId,
    endpoint,
    protocol: 'rtsp',
    authentication: {
      type: 'digest',
    },
    streamSettings: {
      exposureMode: 'auto',
      exposureTimeUs: 5000,
      gainDb: 0,
      whiteBalance: 'auto',
      lprMode: true,
      lprRegion: 'north_america',
      captureOnMotion: true,
      preBufferFrames: 10,
      postBufferFrames: 30,
      streamProtocol: 'rtsp',
      compressionQuality: 85,
      bitrateMbps: 8,
    },
  };
}

/**
 * Create default display config for outdoor kiosk
 */
export function createOutdoorDisplayConfig(): HighNitDisplayConfig {
  return {
    brightnessMode: 'auto',
    brightnessPercent: 80,
    autoSensorEnabled: true,
    nightModeEnabled: true,
    nightModeBrightnessPercent: 30,
    touchSensitivity: 'low', // For gloves
    touchCalibration: {
      topLeftOffset: { x: 0, y: 0 },
      bottomRightOffset: { x: 0, y: 0 },
    },
    multiTouchEnabled: false, // Better for gloved operation
    palmRejection: false, // Disabled for glove compatibility
    sleepTimeoutMinutes: 5,
    wakeOnTouch: true,
    screenSaverEnabled: true,
  };
}

/**
 * Create full kiosk configuration
 */
export function createKioskConfig(
  id: string,
  name: string,
  location: KioskConfig['location'],
  ipAddress: string
): KioskConfig {
  return {
    id,
    name,
    location,
    displayModel: 'elo_4303l_outdoor',
    displayConfig: createOutdoorDisplayConfig(),
    cameraModel: location.includes('gate') ? 'axis_q1700_le' : null,
    cameraConfig: location.includes('gate') 
      ? createGateEntryCameraConfig(`${id}-cam`, `rtsp://${ipAddress}:554/stream1`)
      : null,
    networkConfig: {
      ipAddress,
      subnetMask: '255.255.255.0',
      gateway: ipAddress.replace(/\.\d+$/, '.1'),
      primaryDns: '8.8.8.8',
      secondaryDns: '8.8.4.4',
    },
    operatingHours: {
      start: '05:00',
      end: '23:00',
      timezone: 'America/Chicago',
    },
    maintenanceWindow: {
      dayOfWeek: 0, // Sunday
      hour: 3, // 3 AM
      durationMinutes: 60,
    },
  };
}
