/**
 * TelemetryResolver - Hybrid Data Fusion Service
 * 
 * Merges Vision AI data (YOLOv8 JSON bounding boxes) with
 * UWB (Ultra-Wideband) telemetry (MQTT X,Y coordinates).
 * 
 * UWB provides <30cm accuracy critical for:
 * - Automated crane operations
 * - Precise dock alignment
 * - Occluded vehicle tracking
 * 
 * Rule: If Vision and UWB disagree on location by < 1 meter,
 * prioritize UWB for the "Docking" state.
 */

// ============================================================================
// Types
// ============================================================================

export interface Position2D {
  x: number; // meters from origin
  y: number; // meters from origin
}

export interface Position3D extends Position2D {
  z: number; // meters (height)
}

export interface BoundingBox {
  x: number;      // top-left x in pixels
  y: number;      // top-left y in pixels
  width: number;  // pixels
  height: number; // pixels
}

export interface WorldCoordinates {
  position: Position2D;
  heading: number;        // degrees (0-360, 0 = North)
  confidence: number;     // 0-1
  timestamp: number;      // Unix ms
  source: 'vision' | 'uwb' | 'fused';
}

// ============================================================================
// Vision AI Stream (YOLOv8 Output)
// ============================================================================

export interface VisionDetection {
  id: string;
  class: 'truck' | 'trailer' | 'forklift' | 'person' | 'car' | 'unknown';
  confidence: number;   // 0-1
  boundingBox: BoundingBox;
  trackId?: string;     // Persistent tracking ID
  velocity?: {          // pixels/frame
    vx: number;
    vy: number;
  };
}

export interface VisionFrame {
  cameraId: string;
  frameId: number;
  timestamp: number;    // Unix ms
  resolution: {
    width: number;
    height: number;
  };
  detections: VisionDetection[];
  processingTimeMs: number;
}

export interface CameraCalibration {
  cameraId: string;
  // Homography matrix for ground plane (3x3)
  homographyMatrix: number[][];
  // Camera intrinsics (for 3D reconstruction)
  focalLength: { fx: number; fy: number };
  principalPoint: { cx: number; cy: number };
  distortion: number[];
  // World reference
  cameraPosition: Position3D;
  cameraHeading: number; // degrees
}

// ============================================================================
// UWB Telemetry Stream (MQTT)
// ============================================================================

export interface UWBTag {
  tagId: string;
  assetType: 'truck' | 'trailer' | 'forklift' | 'personnel';
  assetId: string;      // Foreign key to asset record
  batteryPercent: number;
  lastSeen: number;     // Unix ms
}

export interface UWBAnchor {
  anchorId: string;
  position: Position3D;
  zone: 'gate' | 'yard' | 'dock' | 'staging';
  status: 'online' | 'offline' | 'degraded';
}

export interface UWBReading {
  tagId: string;
  timestamp: number;    // Unix ms
  position: Position2D;
  altitude?: number;    // meters (if 3D capable)
  accuracy: number;     // meters (typically <0.3m for UWB)
  anchorsUsed: string[]; // Which anchors calculated this position
  signalStrength: number; // dBm
}

export interface UWBFrame {
  timestamp: number;
  readings: UWBReading[];
  systemStatus: {
    anchorsOnline: number;
    anchorsTotal: number;
    tagsTracked: number;
  };
}

// ============================================================================
// Fused Telemetry
// ============================================================================

export interface TrackedAsset {
  id: string;
  type: 'truck' | 'trailer' | 'forklift' | 'person' | 'unknown';
  
  // Identity
  licensePlate?: string;
  trailerId?: string;
  driverId?: string;
  
  // Position (fused)
  position: WorldCoordinates;
  
  // Raw sources
  visionData?: {
    detection: VisionDetection;
    worldPosition: Position2D;
    cameraId: string;
  };
  uwbData?: {
    reading: UWBReading;
    tagId: string;
  };
  
  // State
  state: AssetState;
  stateChangedAt: number;
  
  // History
  trajectory: WorldCoordinates[];
  maxTrajectoryLength: number;
}

export type AssetState = 
  | 'approaching'   // Moving toward facility
  | 'at_gate'       // At gate checkpoint
  | 'in_yard'       // Maneuvering in yard
  | 'staging'       // In staging area
  | 'docking'       // Approaching dock (UWB prioritized)
  | 'docked'        // At dock door
  | 'departing'     // Leaving facility
  | 'unknown';      // Cannot determine

// ============================================================================
// TelemetryResolver Service
// ============================================================================

export interface TelemetryResolverConfig {
  // Fusion parameters
  visionUwbDisagreementThreshold: number; // meters (default 1.0)
  dockingProximityThreshold: number;      // meters (default 5.0)
  
  // Weighting
  visionBaseWeight: number;  // 0-1 (default 0.4)
  uwbBaseWeight: number;     // 0-1 (default 0.6)
  
  // UWB priority zones (where UWB takes precedence)
  uwbPriorityZones: Array<{
    name: string;
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
  }>;
  
  // Tracking
  maxTrajectoryLength: number;      // points per asset
  staleThresholdMs: number;         // Remove if no updates for this long
  associationDistanceThreshold: number; // meters
}

const DEFAULT_CONFIG: TelemetryResolverConfig = {
  visionUwbDisagreementThreshold: 1.0, // 1 meter
  dockingProximityThreshold: 5.0,      // 5 meters from dock
  visionBaseWeight: 0.4,
  uwbBaseWeight: 0.6,
  uwbPriorityZones: [],
  maxTrajectoryLength: 100,
  staleThresholdMs: 30000, // 30 seconds
  associationDistanceThreshold: 3.0, // 3 meters
};

export class TelemetryResolver {
  private config: TelemetryResolverConfig;
  private assets: Map<string, TrackedAsset> = new Map();
  private uwbTags: Map<string, UWBTag> = new Map();
  private uwbAnchors: Map<string, UWBAnchor> = new Map();
  private cameraCalibrations: Map<string, CameraCalibration> = new Map();
  private eventHandlers: TelemetryEventHandler[] = [];
  
  constructor(config?: Partial<TelemetryResolverConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  // ==========================================================================
  // Configuration
  // ==========================================================================
  
  /**
   * Register camera calibration for vision-to-world coordinate mapping
   */
  registerCamera(calibration: CameraCalibration): void {
    this.cameraCalibrations.set(calibration.cameraId, calibration);
  }
  
  /**
   * Register UWB anchor
   */
  registerAnchor(anchor: UWBAnchor): void {
    this.uwbAnchors.set(anchor.anchorId, anchor);
  }
  
  /**
   * Register UWB tag
   */
  registerTag(tag: UWBTag): void {
    this.uwbTags.set(tag.tagId, tag);
  }
  
  /**
   * Add UWB priority zone (e.g., dock area)
   */
  addUWBPriorityZone(name: string, bounds: TelemetryResolverConfig['uwbPriorityZones'][0]['bounds']): void {
    this.config.uwbPriorityZones.push({ name, bounds });
  }
  
  // ==========================================================================
  // Data Ingestion
  // ==========================================================================
  
  /**
   * Ingest Vision AI frame (YOLOv8 output)
   */
  ingestVisionFrame(frame: VisionFrame): void {
    const calibration = this.cameraCalibrations.get(frame.cameraId);
    
    for (const detection of frame.detections) {
      // Skip low confidence detections
      if (detection.confidence < 0.5) continue;
      
      // Convert pixel coordinates to world coordinates
      const worldPos = calibration 
        ? this.pixelToWorld(detection.boundingBox, calibration)
        : this.estimateWorldPosition(detection.boundingBox, frame.resolution);
      
      // Map detection class to asset type (car -> unknown)
      const assetType: TrackedAsset['type'] = detection.class === 'car' ? 'unknown' : detection.class;
      
      // Find or create tracked asset
      const asset = this.findOrCreateAsset(
        detection.trackId ?? `vision-${frame.cameraId}-${detection.id}`,
        assetType,
        worldPos,
        'vision'
      );
      
      // Update vision data
      asset.visionData = {
        detection,
        worldPosition: worldPos,
        cameraId: frame.cameraId,
      };
      
      // Re-fuse position
      this.fuseAssetPosition(asset, frame.timestamp);
    }
    
    this.pruneStaleAssets();
  }
  
  /**
   * Ingest UWB telemetry frame (MQTT)
   */
  ingestUWBFrame(frame: UWBFrame): void {
    for (const reading of frame.readings) {
      const tag = this.uwbTags.get(reading.tagId);
      if (!tag) {
        console.warn(`Unknown UWB tag: ${reading.tagId}`);
        continue;
      }
      
      // Update tag last seen
      tag.lastSeen = reading.timestamp;
      
      // Map UWB asset type to tracked asset type (personnel -> person)
      const assetType: TrackedAsset['type'] = tag.assetType === 'personnel' ? 'person' : tag.assetType;
      
      // Find or create tracked asset
      const asset = this.findOrCreateAsset(
        tag.assetId,
        assetType,
        reading.position,
        'uwb'
      );
      
      // Update UWB data
      asset.uwbData = {
        reading,
        tagId: reading.tagId,
      };
      
      // Re-fuse position
      this.fuseAssetPosition(asset, frame.timestamp);
    }
    
    this.pruneStaleAssets();
  }
  
  // ==========================================================================
  // Position Fusion
  // ==========================================================================
  
  /**
   * Fuse position from Vision and UWB sources
   * Implements the core fusion logic with UWB priority for docking
   */
  private fuseAssetPosition(asset: TrackedAsset, timestamp: number): void {
    const hasVision = asset.visionData !== undefined;
    const hasUWB = asset.uwbData !== undefined;
    
    let fusedPosition: WorldCoordinates;
    
    if (hasVision && hasUWB) {
      // Both sources available - apply fusion logic
      fusedPosition = this.fuseDualSource(asset, timestamp);
    } else if (hasUWB) {
      // UWB only
      fusedPosition = {
        position: asset.uwbData!.reading.position,
        heading: this.estimateHeading(asset),
        confidence: Math.min(1, asset.uwbData!.reading.accuracy / 0.3), // Normalize to 0.3m baseline
        timestamp,
        source: 'uwb',
      };
    } else if (hasVision) {
      // Vision only
      fusedPosition = {
        position: asset.visionData!.worldPosition,
        heading: this.estimateHeading(asset),
        confidence: asset.visionData!.detection.confidence * 0.8, // Vision less precise
        timestamp,
        source: 'vision',
      };
    } else {
      // No data - shouldn't happen
      return;
    }
    
    // Update asset
    asset.position = fusedPosition;
    
    // Update trajectory
    asset.trajectory.push(fusedPosition);
    if (asset.trajectory.length > asset.maxTrajectoryLength) {
      asset.trajectory.shift();
    }
    
    // Update state
    const newState = this.determineAssetState(asset);
    if (newState !== asset.state) {
      const oldState = asset.state;
      asset.state = newState;
      asset.stateChangedAt = timestamp;
      
      this.emitEvent({
        type: 'state_change',
        assetId: asset.id,
        timestamp,
        data: { oldState, newState },
      });
    }
  }
  
  /**
   * Fuse position when both Vision and UWB are available
   * 
   * RULE: If Vision and UWB disagree by < 1 meter, prioritize UWB
   * for the "Docking" state.
   */
  private fuseDualSource(asset: TrackedAsset, timestamp: number): WorldCoordinates {
    const visionPos = asset.visionData!.worldPosition;
    const uwbPos = asset.uwbData!.reading.position;
    
    // Calculate disagreement distance
    const disagreement = this.euclideanDistance(visionPos, uwbPos);
    
    // Check if in UWB priority zone
    const inUWBPriorityZone = this.isInUWBPriorityZone(uwbPos);
    
    // Determine current state hint
    const isDocking = this.isNearDock(uwbPos);
    
    let visionWeight = this.config.visionBaseWeight;
    let uwbWeight = this.config.uwbBaseWeight;
    
    /**
     * CRITICAL RULE: UWB Priority for Docking
     * 
     * If disagreement < 1 meter AND (docking OR in UWB zone):
     *   -> Prioritize UWB (weight 0.9)
     * 
     * Rationale: UWB provides <30cm accuracy essential for:
     * - Automated crane operations
     * - Precise dock alignment
     * - Areas where cameras may be blocked by trailer itself
     */
    if (disagreement < this.config.visionUwbDisagreementThreshold) {
      if (isDocking || inUWBPriorityZone) {
        uwbWeight = 0.9;
        visionWeight = 0.1;
      }
    } else {
      // Large disagreement - something is wrong, trust higher confidence
      const visionConfidence = asset.visionData!.detection.confidence;
      const uwbAccuracy = asset.uwbData!.reading.accuracy;
      
      if (uwbAccuracy < 0.5 && visionConfidence < 0.7) {
        // Both have issues - weight by relative confidence
        const totalConf = visionConfidence + (1 - uwbAccuracy);
        visionWeight = visionConfidence / totalConf;
        uwbWeight = (1 - uwbAccuracy) / totalConf;
      } else if (uwbAccuracy < 0.5) {
        // Good UWB accuracy
        uwbWeight = 0.8;
        visionWeight = 0.2;
      } else {
        // Good vision confidence
        visionWeight = 0.7;
        uwbWeight = 0.3;
      }
    }
    
    // Weighted average
    const fusedX = visionPos.x * visionWeight + uwbPos.x * uwbWeight;
    const fusedY = visionPos.y * visionWeight + uwbPos.y * uwbWeight;
    
    // Confidence is the weighted sum
    const fusedConfidence = 
      asset.visionData!.detection.confidence * visionWeight +
      Math.min(1, 0.3 / asset.uwbData!.reading.accuracy) * uwbWeight;
    
    return {
      position: { x: fusedX, y: fusedY },
      heading: this.estimateHeading(asset),
      confidence: fusedConfidence,
      timestamp,
      source: 'fused',
    };
  }
  
  /**
   * Check if position is in a UWB priority zone
   */
  private isInUWBPriorityZone(pos: Position2D): boolean {
    for (const zone of this.config.uwbPriorityZones) {
      if (
        pos.x >= zone.bounds.minX && pos.x <= zone.bounds.maxX &&
        pos.y >= zone.bounds.minY && pos.y <= zone.bounds.maxY
      ) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Check if position is near a dock (within docking proximity threshold)
   */
  private isNearDock(pos: Position2D): boolean {
    // Check against dock zones in UWB priority zones
    for (const zone of this.config.uwbPriorityZones) {
      if (zone.name.toLowerCase().includes('dock')) {
        const centerX = (zone.bounds.minX + zone.bounds.maxX) / 2;
        const centerY = (zone.bounds.minY + zone.bounds.maxY) / 2;
        const distance = this.euclideanDistance(pos, { x: centerX, y: centerY });
        
        if (distance < this.config.dockingProximityThreshold) {
          return true;
        }
      }
    }
    return false;
  }
  
  // ==========================================================================
  // State Determination
  // ==========================================================================
  
  /**
   * Determine asset state based on position and trajectory
   */
  private determineAssetState(asset: TrackedAsset): AssetState {
    const pos = asset.position.position;
    
    // Check specific zones
    for (const zone of this.config.uwbPriorityZones) {
      const inZone = 
        pos.x >= zone.bounds.minX && pos.x <= zone.bounds.maxX &&
        pos.y >= zone.bounds.minY && pos.y <= zone.bounds.maxY;
      
      if (inZone) {
        const zoneName = zone.name.toLowerCase();
        if (zoneName.includes('dock')) {
          // Check if moving or stationary
          const isStationary = this.isAssetStationary(asset);
          return isStationary ? 'docked' : 'docking';
        }
        if (zoneName.includes('gate')) return 'at_gate';
        if (zoneName.includes('staging')) return 'staging';
      }
    }
    
    // Check trajectory for movement patterns
    if (asset.trajectory.length >= 3) {
      const direction = this.getMovementDirection(asset);
      if (direction === 'inbound') return 'approaching';
      if (direction === 'outbound') return 'departing';
    }
    
    return 'in_yard';
  }
  
  /**
   * Check if asset is stationary (velocity near zero)
   */
  private isAssetStationary(asset: TrackedAsset, thresholdMps = 0.5): boolean {
    if (asset.trajectory.length < 2) return true;
    
    const recent = asset.trajectory.slice(-5);
    if (recent.length < 2) return true;
    
    const first = recent[0];
    const last = recent[recent.length - 1];
    const distance = this.euclideanDistance(first.position, last.position);
    const timeDeltaS = (last.timestamp - first.timestamp) / 1000;
    
    if (timeDeltaS <= 0) return true;
    
    const velocity = distance / timeDeltaS;
    return velocity < thresholdMps;
  }
  
  /**
   * Determine movement direction (inbound/outbound/lateral)
   */
  private getMovementDirection(asset: TrackedAsset): 'inbound' | 'outbound' | 'lateral' {
    if (asset.trajectory.length < 3) return 'lateral';
    
    const recent = asset.trajectory.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const dy = last.position.y - first.position.y;
    const dx = last.position.x - first.position.x;
    
    // Assuming Y increases toward facility interior
    if (Math.abs(dy) > Math.abs(dx)) {
      return dy > 0 ? 'inbound' : 'outbound';
    }
    
    return 'lateral';
  }
  
  // ==========================================================================
  // Coordinate Transformation
  // ==========================================================================
  
  /**
   * Convert pixel coordinates to world coordinates using camera calibration
   */
  private pixelToWorld(bbox: BoundingBox, calibration: CameraCalibration): Position2D {
    // Get foot point (center bottom of bounding box)
    const footX = bbox.x + bbox.width / 2;
    const footY = bbox.y + bbox.height;
    
    // Apply homography transformation (inverse perspective mapping)
    const H = calibration.homographyMatrix;
    const denominator = H[2][0] * footX + H[2][1] * footY + H[2][2];
    
    const worldX = (H[0][0] * footX + H[0][1] * footY + H[0][2]) / denominator;
    const worldY = (H[1][0] * footX + H[1][1] * footY + H[1][2]) / denominator;
    
    // Add camera position offset
    return {
      x: worldX + calibration.cameraPosition.x,
      y: worldY + calibration.cameraPosition.y,
    };
  }
  
  /**
   * Estimate world position without calibration (rough approximation)
   */
  private estimateWorldPosition(bbox: BoundingBox, resolution: { width: number; height: number }): Position2D {
    // Very rough estimate - assumes camera is overhead looking down
    const normalizedX = (bbox.x + bbox.width / 2) / resolution.width;
    const normalizedY = (bbox.y + bbox.height) / resolution.height;
    
    // Map to approximate yard coordinates (assume 100m x 100m yard)
    return {
      x: normalizedX * 100,
      y: normalizedY * 100,
    };
  }
  
  /**
   * Estimate heading from trajectory
   */
  private estimateHeading(asset: TrackedAsset): number {
    if (asset.trajectory.length < 2) return 0;
    
    const recent = asset.trajectory.slice(-3);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const dx = last.position.x - first.position.x;
    const dy = last.position.y - first.position.y;
    
    // Convert to degrees (0 = North, 90 = East)
    let heading = Math.atan2(dx, dy) * (180 / Math.PI);
    if (heading < 0) heading += 360;
    
    return heading;
  }
  
  // ==========================================================================
  // Asset Management
  // ==========================================================================
  
  /**
   * Find existing asset or create new one
   */
  private findOrCreateAsset(
    id: string,
    type: TrackedAsset['type'],
    position: Position2D,
    source: 'vision' | 'uwb'
  ): TrackedAsset {
    // Try exact ID match
    let asset = this.assets.get(id);
    
    if (!asset) {
      // Try to associate with existing asset by proximity
      asset = this.findAssetByProximity(position, type);
    }
    
    if (!asset) {
      // Create new asset
      asset = {
        id,
        type,
        position: {
          position,
          heading: 0,
          confidence: 0.5,
          timestamp: Date.now(),
          source,
        },
        state: 'unknown',
        stateChangedAt: Date.now(),
        trajectory: [],
        maxTrajectoryLength: this.config.maxTrajectoryLength,
      };
      this.assets.set(id, asset);
      
      this.emitEvent({
        type: 'asset_detected',
        assetId: id,
        timestamp: Date.now(),
        data: { type, position, source },
      });
    }
    
    return asset;
  }
  
  /**
   * Find asset by proximity (for associating vision detections with UWB tags)
   */
  private findAssetByProximity(position: Position2D, type: TrackedAsset['type']): TrackedAsset | undefined {
    let closest: TrackedAsset | undefined;
    let closestDistance = Infinity;
    
    for (const asset of this.assets.values()) {
      if (asset.type !== type) continue;
      
      const distance = this.euclideanDistance(position, asset.position.position);
      if (distance < this.config.associationDistanceThreshold && distance < closestDistance) {
        closest = asset;
        closestDistance = distance;
      }
    }
    
    return closest;
  }
  
  /**
   * Remove assets with no recent updates
   */
  private pruneStaleAssets(): void {
    const now = Date.now();
    
    for (const [id, asset] of this.assets) {
      if (now - asset.position.timestamp > this.config.staleThresholdMs) {
        this.assets.delete(id);
        
        this.emitEvent({
          type: 'asset_lost',
          assetId: id,
          timestamp: now,
          data: { lastPosition: asset.position.position, lastState: asset.state },
        });
      }
    }
  }
  
  // ==========================================================================
  // Event System
  // ==========================================================================
  
  /**
   * Subscribe to telemetry events
   */
  onEvent(handler: TelemetryEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
    };
  }
  
  /**
   * Emit event
   */
  private emitEvent(event: TelemetryEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Telemetry event handler error:', error);
      }
    }
  }
  
  // ==========================================================================
  // Query Interface
  // ==========================================================================
  
  /**
   * Get all tracked assets
   */
  getAssets(): TrackedAsset[] {
    return Array.from(this.assets.values());
  }
  
  /**
   * Get asset by ID
   */
  getAsset(id: string): TrackedAsset | undefined {
    return this.assets.get(id);
  }
  
  /**
   * Get assets by state
   */
  getAssetsByState(state: AssetState): TrackedAsset[] {
    return this.getAssets().filter(a => a.state === state);
  }
  
  /**
   * Get assets in zone
   */
  getAssetsInZone(zoneName: string): TrackedAsset[] {
    const zone = this.config.uwbPriorityZones.find(z => z.name === zoneName);
    if (!zone) return [];
    
    return this.getAssets().filter(asset => {
      const pos = asset.position.position;
      return (
        pos.x >= zone.bounds.minX && pos.x <= zone.bounds.maxX &&
        pos.y >= zone.bounds.minY && pos.y <= zone.bounds.maxY
      );
    });
  }
  
  /**
   * Get system status
   */
  getStatus(): TelemetrySystemStatus {
    return {
      assetsTracked: this.assets.size,
      assetsByType: this.countAssetsByType(),
      assetsByState: this.countAssetsByState(),
      uwbAnchorsOnline: Array.from(this.uwbAnchors.values()).filter(a => a.status === 'online').length,
      uwbTagsActive: Array.from(this.uwbTags.values()).filter(t => Date.now() - t.lastSeen < 60000).length,
      camerasConfigured: this.cameraCalibrations.size,
    };
  }
  
  private countAssetsByType(): Record<TrackedAsset['type'], number> {
    const counts: Record<TrackedAsset['type'], number> = {
      truck: 0,
      trailer: 0,
      forklift: 0,
      person: 0,
      unknown: 0,
    };
    
    for (const asset of this.assets.values()) {
      counts[asset.type]++;
    }
    
    return counts;
  }
  
  private countAssetsByState(): Record<AssetState, number> {
    const counts: Record<AssetState, number> = {
      approaching: 0,
      at_gate: 0,
      in_yard: 0,
      staging: 0,
      docking: 0,
      docked: 0,
      departing: 0,
      unknown: 0,
    };
    
    for (const asset of this.assets.values()) {
      counts[asset.state]++;
    }
    
    return counts;
  }
  
  // ==========================================================================
  // Utilities
  // ==========================================================================
  
  private euclideanDistance(a: Position2D, b: Position2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// ============================================================================
// Event Types
// ============================================================================

export interface TelemetryEvent {
  type: 'asset_detected' | 'asset_lost' | 'state_change' | 'zone_enter' | 'zone_exit';
  assetId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export type TelemetryEventHandler = (event: TelemetryEvent) => void;

export interface TelemetrySystemStatus {
  assetsTracked: number;
  assetsByType: Record<TrackedAsset['type'], number>;
  assetsByState: Record<AssetState, number>;
  uwbAnchorsOnline: number;
  uwbTagsActive: number;
  camerasConfigured: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create TelemetryResolver with dock zones pre-configured
 */
export function createDockingTelemetryResolver(
  dockPositions: Array<{ id: string; x: number; y: number }>
): TelemetryResolver {
  const resolver = new TelemetryResolver();
  
  // Add dock zones as UWB priority zones
  for (const dock of dockPositions) {
    resolver.addUWBPriorityZone(`dock-${dock.id}`, {
      minX: dock.x - 5,
      maxX: dock.x + 5,
      minY: dock.y - 10,
      maxY: dock.y + 2,
    });
  }
  
  return resolver;
}

/**
 * Create TelemetryResolver for full yard tracking
 */
export function createYardTelemetryResolver(yardDimensions: {
  width: number;
  length: number;
  gateX: number;
  gateY: number;
  dockRowY: number;
  numDocks: number;
  dockSpacing: number;
}): TelemetryResolver {
  const resolver = new TelemetryResolver({
    staleThresholdMs: 60000, // 1 minute for yard
    maxTrajectoryLength: 200,
  });
  
  // Gate zone
  resolver.addUWBPriorityZone('gate', {
    minX: yardDimensions.gateX - 10,
    maxX: yardDimensions.gateX + 10,
    minY: yardDimensions.gateY - 5,
    maxY: yardDimensions.gateY + 5,
  });
  
  // Dock zones
  for (let i = 0; i < yardDimensions.numDocks; i++) {
    const dockX = 10 + i * yardDimensions.dockSpacing;
    resolver.addUWBPriorityZone(`dock-${i + 1}`, {
      minX: dockX - 2.5,
      maxX: dockX + 2.5,
      minY: yardDimensions.dockRowY - 15,
      maxY: yardDimensions.dockRowY + 2,
    });
  }
  
  // Staging area (middle of yard)
  resolver.addUWBPriorityZone('staging', {
    minX: yardDimensions.width * 0.25,
    maxX: yardDimensions.width * 0.75,
    minY: yardDimensions.length * 0.3,
    maxY: yardDimensions.length * 0.5,
  });
  
  return resolver;
}
