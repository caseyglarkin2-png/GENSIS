/**
 * LayoutOptimizer - Genetic Algorithm for Yard Layout Optimization
 * 
 * Implements constrained beam search / genetic algorithm to optimize
 * facility yard layouts based on Reynolds Number scoring for
 * minimizing "operational viscosity" (traffic flow resistance).
 * 
 * Re = ρvL/μ where:
 * - ρ (rho) = traffic density (trucks/hour)
 * - v = average velocity (yards/minute)
 * - L = characteristic length (yard dimensions)
 * - μ (mu) = operational viscosity (delay factors)
 */

// ============================================================================
// Types
// ============================================================================

export interface YardDimensions {
  width: number;  // meters
  length: number; // meters
  area: number;   // square meters
}

export interface YardElement {
  id: string;
  type: 'dock' | 'gate' | 'parking_spot' | 'staging_area' | 'drive_lane' | 'holding_area';
  x: number;      // position (meters from origin)
  y: number;
  width: number;  // element dimensions
  height: number;
  rotation: number; // degrees (0, 90, 180, 270)
  capacity?: number; // for parking/staging
  flowDirection?: 'inbound' | 'outbound' | 'bidirectional';
}

export interface YardLayout {
  id: string;
  dimensions: YardDimensions;
  elements: YardElement[];
  fitness: number;
  reynoldsNumber: number;
  generation: number;
}

export interface LayoutConstraints {
  // Minimum distances (meters)
  minDockSpacing: number;
  minGateWidth: number;
  minDriveLaneWidth: number;
  minParkingSpotWidth: number;
  minParkingSpotLength: number;
  
  // Required elements
  minDocks: number;
  minGates: number;
  minParkingSpots: number;
  
  // Traffic parameters
  expectedTrucksPerHour: number;
  avgTruckLengthMeters: number;
  avgTruckWidthMeters: number;
  
  // Operational targets
  targetTurnTimeMinutes: number;
  targetDockUtilization: number; // 0-1
}

export interface OperationalMetrics {
  trafficDensity: number;      // ρ - trucks per 100 sqm
  avgVelocity: number;         // v - meters per minute
  characteristicLength: number; // L - avg travel distance
  viscosity: number;           // μ - delay factor (1 = no delay)
  reynoldsNumber: number;      // Re = ρvL/μ
  flowRegime: 'laminar' | 'transitional' | 'turbulent';
}

export interface OptimizationResult {
  bestLayout: YardLayout;
  generationsRun: number;
  convergenceHistory: number[];
  metrics: OperationalMetrics;
  improvements: LayoutImprovement[];
}

export interface LayoutImprovement {
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'flow' | 'capacity' | 'safety' | 'efficiency';
  estimatedGain: number; // percentage improvement
}

// ============================================================================
// Configuration
// ============================================================================

export interface GeneticAlgorithmConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
  convergenceThreshold: number;
  tournamentSize: number;
}

const DEFAULT_GA_CONFIG: GeneticAlgorithmConfig = {
  populationSize: 100,
  generations: 500,
  mutationRate: 0.15,
  crossoverRate: 0.8,
  elitismCount: 5,
  convergenceThreshold: 0.001,
  tournamentSize: 5,
};

const DEFAULT_CONSTRAINTS: LayoutConstraints = {
  minDockSpacing: 4.5,
  minGateWidth: 8,
  minDriveLaneWidth: 12,
  minParkingSpotWidth: 3.5,
  minParkingSpotLength: 18,
  minDocks: 4,
  minGates: 1,
  minParkingSpots: 20,
  expectedTrucksPerHour: 15,
  avgTruckLengthMeters: 16.5,
  avgTruckWidthMeters: 2.6,
  targetTurnTimeMinutes: 18,
  targetDockUtilization: 0.75,
};

// ============================================================================
// Reynolds Number Calculator
// ============================================================================

export function calculateReynoldsNumber(
  trafficDensity: number,  // ρ - trucks per 100 sqm
  avgVelocity: number,     // v - meters per minute
  characteristicLength: number, // L - avg travel distance in meters
  viscosity: number        // μ - delay factor (1 = no delay, >1 = delays)
): number {
  /**
   * Re = ρvL/μ
   * 
   * In fluid dynamics, Re determines flow regime:
   * - Re < 2300: Laminar (smooth, predictable flow)
   * - 2300 < Re < 4000: Transitional (unstable)
   * - Re > 4000: Turbulent (chaotic flow)
   * 
   * For yard operations, we want HIGH Re (efficient flow)
   * but not too high (chaotic/dangerous)
   * 
   * Optimal range: 2500-3500 (transitional but controlled)
   */
  if (viscosity <= 0) viscosity = 0.01; // Prevent division by zero
  return (trafficDensity * avgVelocity * characteristicLength) / viscosity;
}

export function determineFlowRegime(re: number): 'laminar' | 'transitional' | 'turbulent' {
  if (re < 2300) return 'laminar';
  if (re < 4000) return 'transitional';
  return 'turbulent';
}

// ============================================================================
// Layout Optimizer Class
// ============================================================================

export class LayoutOptimizer {
  private config: GeneticAlgorithmConfig;
  private constraints: LayoutConstraints;
  private dimensions: YardDimensions;
  private population: YardLayout[] = [];
  private bestLayout: YardLayout | null = null;
  private convergenceHistory: number[] = [];
  
  constructor(
    dimensions: YardDimensions,
    constraints?: Partial<LayoutConstraints>,
    config?: Partial<GeneticAlgorithmConfig>
  ) {
    this.dimensions = dimensions;
    this.constraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
    this.config = { ...DEFAULT_GA_CONFIG, ...config };
  }

  /**
   * Main optimization entry point
   */
  async optimize(): Promise<OptimizationResult> {
    // Initialize population with random valid layouts
    this.initializePopulation();
    
    let generationsRun = 0;
    let converged = false;
    
    for (let gen = 0; gen < this.config.generations && !converged; gen++) {
      // Evaluate fitness for all individuals
      this.evaluatePopulation();
      
      // Track convergence
      const bestFitness = Math.max(...this.population.map(l => l.fitness));
      this.convergenceHistory.push(bestFitness);
      
      // Check for convergence
      if (gen > 50) {
        const recentHistory = this.convergenceHistory.slice(-50);
        const variance = this.calculateVariance(recentHistory);
        if (variance < this.config.convergenceThreshold) {
          converged = true;
        }
      }
      
      // Selection and breeding
      const newPopulation = this.selection();
      this.population = newPopulation;
      
      generationsRun = gen + 1;
    }
    
    // Final evaluation and select best
    this.evaluatePopulation();
    this.bestLayout = this.population.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    );
    
    const metrics = this.calculateOperationalMetrics(this.bestLayout);
    const improvements = this.analyzeImprovements(this.bestLayout);
    
    return {
      bestLayout: this.bestLayout,
      generationsRun,
      convergenceHistory: this.convergenceHistory,
      metrics,
      improvements,
    };
  }

  /**
   * Initialize population with random valid layouts
   */
  private initializePopulation(): void {
    this.population = [];
    
    for (let i = 0; i < this.config.populationSize; i++) {
      const layout = this.generateRandomLayout();
      layout.generation = 0;
      this.population.push(layout);
    }
  }

  /**
   * Generate a random valid layout
   */
  private generateRandomLayout(): YardLayout {
    const layout: YardLayout = {
      id: this.generateId(),
      dimensions: this.dimensions,
      elements: [],
      fitness: 0,
      reynoldsNumber: 0,
      generation: 0,
    };
    
    // Place docks along one edge (typically north)
    const dockCount = this.constraints.minDocks + Math.floor(Math.random() * 4);
    const dockSpacing = this.dimensions.width / (dockCount + 1);
    
    for (let i = 0; i < dockCount; i++) {
      layout.elements.push({
        id: this.generateId(),
        type: 'dock',
        x: dockSpacing * (i + 1) - 2.5,
        y: this.dimensions.length - 5,
        width: 5,
        height: 5,
        rotation: 0,
        flowDirection: Math.random() > 0.5 ? 'inbound' : 'outbound',
      });
    }
    
    // Place gates
    const gateCount = this.constraints.minGates + Math.floor(Math.random() * 2);
    for (let i = 0; i < gateCount; i++) {
      layout.elements.push({
        id: this.generateId(),
        type: 'gate',
        x: i === 0 ? 0 : this.dimensions.width - this.constraints.minGateWidth,
        y: this.dimensions.length / 2,
        width: this.constraints.minGateWidth,
        height: this.constraints.minGateWidth,
        rotation: 0,
        flowDirection: i === 0 ? 'inbound' : 'outbound',
      });
    }
    
    // Place parking spots in a grid
    const spotsPerRow = Math.floor(
      (this.dimensions.width - 2 * this.constraints.minDriveLaneWidth) / 
      this.constraints.minParkingSpotWidth
    );
    const rows = Math.floor(
      (this.dimensions.length - 30) / // Leave space for docks and staging
      (this.constraints.minParkingSpotLength + 2)
    );
    
    const spotCount = Math.min(spotsPerRow * rows, this.constraints.minParkingSpots + 30);
    
    for (let row = 0; row < rows && layout.elements.filter(e => e.type === 'parking_spot').length < spotCount; row++) {
      for (let col = 0; col < spotsPerRow; col++) {
        if (layout.elements.filter(e => e.type === 'parking_spot').length >= spotCount) break;
        
        layout.elements.push({
          id: this.generateId(),
          type: 'parking_spot',
          x: this.constraints.minDriveLaneWidth + col * this.constraints.minParkingSpotWidth,
          y: 20 + row * (this.constraints.minParkingSpotLength + 2),
          width: this.constraints.minParkingSpotWidth,
          height: this.constraints.minParkingSpotLength,
          rotation: 0,
        });
      }
    }
    
    // Add staging areas
    layout.elements.push({
      id: this.generateId(),
      type: 'staging_area',
      x: this.dimensions.width / 4,
      y: 5,
      width: this.dimensions.width / 2,
      height: 15,
      rotation: 0,
      capacity: 10,
    });
    
    // Add main drive lane
    layout.elements.push({
      id: this.generateId(),
      type: 'drive_lane',
      x: this.dimensions.width / 2 - 6,
      y: 0,
      width: 12,
      height: this.dimensions.length,
      rotation: 0,
      flowDirection: 'bidirectional',
    });
    
    return layout;
  }

  /**
   * Evaluate fitness of all individuals in population
   */
  private evaluatePopulation(): void {
    for (const layout of this.population) {
      layout.fitness = this.calculateFitness(layout);
      layout.reynoldsNumber = this.calculateLayoutReynoldsNumber(layout);
    }
    
    // Sort by fitness
    this.population.sort((a, b) => b.fitness - a.fitness);
  }

  /**
   * Calculate fitness score for a layout (0-100)
   */
  private calculateFitness(layout: YardLayout): number {
    let score = 0;
    
    // 1. Reynolds Number optimization (30 points)
    // Target Re range: 2500-3500 for optimal flow
    const re = this.calculateLayoutReynoldsNumber(layout);
    const targetRe = 3000;
    const reDeviation = Math.abs(re - targetRe) / targetRe;
    score += Math.max(0, 30 * (1 - reDeviation));
    
    // 2. Dock utilization efficiency (20 points)
    const docks = layout.elements.filter(e => e.type === 'dock');
    const optimalDockCount = Math.ceil(
      this.constraints.expectedTrucksPerHour / 
      (60 / this.constraints.targetTurnTimeMinutes)
    );
    const dockScore = Math.min(1, docks.length / optimalDockCount);
    score += 20 * dockScore;
    
    // 3. Travel distance minimization (20 points)
    const avgTravelDistance = this.calculateAvgTravelDistance(layout);
    const optimalTravel = Math.sqrt(this.dimensions.area) / 2;
    const travelScore = Math.max(0, 1 - (avgTravelDistance - optimalTravel) / optimalTravel);
    score += 20 * travelScore;
    
    // 4. Parking capacity (15 points)
    const parkingSpots = layout.elements.filter(e => e.type === 'parking_spot').length;
    const requiredSpots = this.constraints.minParkingSpots;
    const parkingScore = Math.min(1, parkingSpots / requiredSpots);
    score += 15 * parkingScore;
    
    // 5. Safety and spacing compliance (15 points)
    const safetyScore = this.calculateSafetyScore(layout);
    score += 15 * safetyScore;
    
    return Math.round(score * 100) / 100;
  }

  /**
   * Calculate Reynolds Number for a specific layout
   */
  private calculateLayoutReynoldsNumber(layout: YardLayout): number {
    const area = this.dimensions.area;
    const trucksPerHour = this.constraints.expectedTrucksPerHour;
    
    // Traffic density (trucks per 100 sqm)
    const trafficDensity = (trucksPerHour * this.constraints.avgTruckLengthMeters * 
                           this.constraints.avgTruckWidthMeters) / (area / 100);
    
    // Average velocity based on layout efficiency
    const driveLanes = layout.elements.filter(e => e.type === 'drive_lane');
    const avgVelocity = driveLanes.length > 0 ? 
      8 + driveLanes.length * 2 : // meters per minute
      5;
    
    // Characteristic length (average travel distance)
    const characteristicLength = this.calculateAvgTravelDistance(layout);
    
    // Viscosity (delay factor based on layout complexity)
    const viscosity = this.calculateViscosity(layout);
    
    return calculateReynoldsNumber(trafficDensity, avgVelocity, characteristicLength, viscosity);
  }

  /**
   * Calculate average travel distance in the layout
   */
  private calculateAvgTravelDistance(layout: YardLayout): number {
    const gates = layout.elements.filter(e => e.type === 'gate');
    const docks = layout.elements.filter(e => e.type === 'dock');
    const parking = layout.elements.filter(e => e.type === 'parking_spot');
    
    if (gates.length === 0 || (docks.length === 0 && parking.length === 0)) {
      return Math.sqrt(this.dimensions.area);
    }
    
    let totalDistance = 0;
    let count = 0;
    
    for (const gate of gates) {
      // Gate to dock distances
      for (const dock of docks) {
        totalDistance += this.euclideanDistance(gate, dock);
        count++;
      }
      // Gate to parking distances
      for (const spot of parking.slice(0, 5)) { // Sample first 5 spots
        totalDistance += this.euclideanDistance(gate, spot);
        count++;
      }
    }
    
    return count > 0 ? totalDistance / count : Math.sqrt(this.dimensions.area);
  }

  /**
   * Calculate viscosity (operational delay factor)
   */
  private calculateViscosity(layout: YardLayout): number {
    let viscosity = 1.0; // Base viscosity
    
    // Increase viscosity for bottlenecks
    const gates = layout.elements.filter(e => e.type === 'gate');
    const docks = layout.elements.filter(e => e.type === 'dock');
    
    // Fewer gates = higher viscosity
    if (gates.length < 2) viscosity *= 1.5;
    
    // Poor dock to truck ratio = higher viscosity
    const dockCapacity = docks.length * (60 / this.constraints.targetTurnTimeMinutes);
    if (dockCapacity < this.constraints.expectedTrucksPerHour) {
      viscosity *= 1.3;
    }
    
    // Check for layout conflicts (elements overlapping)
    const conflicts = this.countConflicts(layout);
    viscosity *= 1 + (conflicts * 0.1);
    
    return viscosity;
  }

  /**
   * Calculate safety compliance score (0-1)
   */
  private calculateSafetyScore(layout: YardLayout): number {
    let violations = 0;
    let checks = 0;
    
    const docks = layout.elements.filter(e => e.type === 'dock');
    
    // Check dock spacing
    for (let i = 0; i < docks.length; i++) {
      for (let j = i + 1; j < docks.length; j++) {
        checks++;
        const distance = this.euclideanDistance(docks[i], docks[j]);
        if (distance < this.constraints.minDockSpacing) {
          violations++;
        }
      }
    }
    
    // Check drive lane width
    const driveLanes = layout.elements.filter(e => e.type === 'drive_lane');
    for (const lane of driveLanes) {
      checks++;
      if (lane.width < this.constraints.minDriveLaneWidth) {
        violations++;
      }
    }
    
    // Check parking spot dimensions
    const parking = layout.elements.filter(e => e.type === 'parking_spot');
    for (const spot of parking) {
      checks++;
      if (spot.width < this.constraints.minParkingSpotWidth || 
          spot.height < this.constraints.minParkingSpotLength) {
        violations++;
      }
    }
    
    return checks > 0 ? Math.max(0, 1 - violations / checks) : 1;
  }

  /**
   * Count overlapping elements
   */
  private countConflicts(layout: YardLayout): number {
    let conflicts = 0;
    
    for (let i = 0; i < layout.elements.length; i++) {
      for (let j = i + 1; j < layout.elements.length; j++) {
        if (this.elementsOverlap(layout.elements[i], layout.elements[j])) {
          conflicts++;
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Check if two elements overlap
   */
  private elementsOverlap(a: YardElement, b: YardElement): boolean {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    );
  }

  /**
   * Selection and breeding for next generation
   */
  private selection(): YardLayout[] {
    const newPopulation: YardLayout[] = [];
    const nextGeneration = this.population[0].generation + 1;
    
    // Elitism: Keep top performers
    for (let i = 0; i < this.config.elitismCount; i++) {
      const elite = { ...this.population[i], generation: nextGeneration };
      newPopulation.push(elite);
    }
    
    // Fill rest with offspring
    while (newPopulation.length < this.config.populationSize) {
      // Tournament selection
      const parent1 = this.tournamentSelect();
      const parent2 = this.tournamentSelect();
      
      // Crossover
      let offspring: YardLayout;
      if (Math.random() < this.config.crossoverRate) {
        offspring = this.crossover(parent1, parent2);
      } else {
        offspring = { ...parent1 };
      }
      
      // Mutation
      if (Math.random() < this.config.mutationRate) {
        offspring = this.mutate(offspring);
      }
      
      offspring.generation = nextGeneration;
      offspring.id = this.generateId();
      newPopulation.push(offspring);
    }
    
    return newPopulation;
  }

  /**
   * Tournament selection
   */
  private tournamentSelect(): YardLayout {
    const tournament: YardLayout[] = [];
    
    for (let i = 0; i < this.config.tournamentSize; i++) {
      const idx = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[idx]);
    }
    
    return tournament.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    );
  }

  /**
   * Crossover two parent layouts
   */
  private crossover(parent1: YardLayout, parent2: YardLayout): YardLayout {
    // Single-point crossover on elements
    const crossoverPoint = Math.floor(Math.random() * parent1.elements.length);
    
    const childElements = [
      ...parent1.elements.slice(0, crossoverPoint),
      ...parent2.elements.slice(crossoverPoint),
    ].map(e => ({ ...e, id: this.generateId() }));
    
    return {
      id: this.generateId(),
      dimensions: this.dimensions,
      elements: childElements,
      fitness: 0,
      reynoldsNumber: 0,
      generation: 0,
    };
  }

  /**
   * Mutate a layout
   */
  private mutate(layout: YardLayout): YardLayout {
    const mutated = { ...layout, elements: [...layout.elements] };
    
    // Random mutation type
    const mutationType = Math.random();
    
    if (mutationType < 0.4 && mutated.elements.length > 0) {
      // Move an element
      const idx = Math.floor(Math.random() * mutated.elements.length);
      mutated.elements[idx] = {
        ...mutated.elements[idx],
        x: Math.max(0, Math.min(this.dimensions.width - mutated.elements[idx].width,
          mutated.elements[idx].x + (Math.random() - 0.5) * 10)),
        y: Math.max(0, Math.min(this.dimensions.length - mutated.elements[idx].height,
          mutated.elements[idx].y + (Math.random() - 0.5) * 10)),
      };
    } else if (mutationType < 0.7) {
      // Add a parking spot
      mutated.elements.push({
        id: this.generateId(),
        type: 'parking_spot',
        x: Math.random() * (this.dimensions.width - this.constraints.minParkingSpotWidth),
        y: Math.random() * (this.dimensions.length - this.constraints.minParkingSpotLength),
        width: this.constraints.minParkingSpotWidth,
        height: this.constraints.minParkingSpotLength,
        rotation: 0,
      });
    } else if (mutated.elements.filter(e => e.type === 'parking_spot').length > this.constraints.minParkingSpots) {
      // Remove a parking spot
      const parkingIdx = mutated.elements.findIndex(e => e.type === 'parking_spot');
      if (parkingIdx >= 0) {
        mutated.elements.splice(parkingIdx, 1);
      }
    }
    
    return mutated;
  }

  /**
   * Calculate operational metrics for a layout
   */
  private calculateOperationalMetrics(layout: YardLayout): OperationalMetrics {
    const area = this.dimensions.area;
    const trucksPerHour = this.constraints.expectedTrucksPerHour;
    
    const trafficDensity = (trucksPerHour * this.constraints.avgTruckLengthMeters * 
                           this.constraints.avgTruckWidthMeters) / (area / 100);
    
    const driveLanes = layout.elements.filter(e => e.type === 'drive_lane');
    const avgVelocity = driveLanes.length > 0 ? 8 + driveLanes.length * 2 : 5;
    
    const characteristicLength = this.calculateAvgTravelDistance(layout);
    const viscosity = this.calculateViscosity(layout);
    const reynoldsNumber = calculateReynoldsNumber(trafficDensity, avgVelocity, characteristicLength, viscosity);
    
    return {
      trafficDensity,
      avgVelocity,
      characteristicLength,
      viscosity,
      reynoldsNumber,
      flowRegime: determineFlowRegime(reynoldsNumber),
    };
  }

  /**
   * Analyze layout and suggest improvements
   */
  private analyzeImprovements(layout: YardLayout): LayoutImprovement[] {
    const improvements: LayoutImprovement[] = [];
    
    // Check gate count
    const gates = layout.elements.filter(e => e.type === 'gate');
    if (gates.length < 2) {
      improvements.push({
        description: 'Add a second gate to enable separate inbound/outbound flow',
        impact: 'high',
        category: 'flow',
        estimatedGain: 25,
      });
    }
    
    // Check dock capacity
    const docks = layout.elements.filter(e => e.type === 'dock');
    const dockCapacity = docks.length * (60 / this.constraints.targetTurnTimeMinutes);
    if (dockCapacity < this.constraints.expectedTrucksPerHour * 1.2) {
      improvements.push({
        description: 'Increase dock count to handle peak traffic with 20% buffer',
        impact: 'high',
        category: 'capacity',
        estimatedGain: 20,
      });
    }
    
    // Check parking utilization
    const parking = layout.elements.filter(e => e.type === 'parking_spot');
    if (parking.length < this.constraints.expectedTrucksPerHour * 2) {
      improvements.push({
        description: 'Add more yard parking to prevent staging overflow',
        impact: 'medium',
        category: 'capacity',
        estimatedGain: 15,
      });
    }
    
    // Check flow regime
    const re = this.calculateLayoutReynoldsNumber(layout);
    if (re < 2300) {
      improvements.push({
        description: 'Yard flow is too slow (laminar) - widen drive lanes or add shortcuts',
        impact: 'medium',
        category: 'efficiency',
        estimatedGain: 18,
      });
    } else if (re > 4000) {
      improvements.push({
        description: 'Yard flow is chaotic (turbulent) - add traffic control points',
        impact: 'high',
        category: 'safety',
        estimatedGain: 22,
      });
    }
    
    return improvements;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================
  
  private euclideanDistance(a: YardElement, b: YardElement): number {
    const dx = (a.x + a.width / 2) - (b.x + b.width / 2);
    const dy = (a.y + a.height / 2) - (b.y + b.height / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an optimizer for a facility based on its metrics
 */
export function createFacilityOptimizer(
  yardArea: number, // square meters
  docksCount: number,
  gatesCount: number,
  trucksPerDay: number,
  config?: Partial<GeneticAlgorithmConfig>
): LayoutOptimizer {
  // Estimate dimensions (assume roughly square)
  const side = Math.sqrt(yardArea);
  const dimensions: YardDimensions = {
    width: side,
    length: side,
    area: yardArea,
  };
  
  const constraints: Partial<LayoutConstraints> = {
    minDocks: docksCount,
    minGates: gatesCount,
    expectedTrucksPerHour: Math.ceil(trucksPerDay / 10), // Assume 10-hour operating day
  };
  
  return new LayoutOptimizer(dimensions, constraints, config);
}

/**
 * Quick optimization with fewer generations
 */
export async function quickOptimize(
  dimensions: YardDimensions,
  constraints?: Partial<LayoutConstraints>
): Promise<OptimizationResult> {
  const optimizer = new LayoutOptimizer(dimensions, constraints, {
    populationSize: 50,
    generations: 100,
  });
  
  return optimizer.optimize();
}

/**
 * Full optimization with maximum accuracy
 */
export async function fullOptimize(
  dimensions: YardDimensions,
  constraints?: Partial<LayoutConstraints>
): Promise<OptimizationResult> {
  const optimizer = new LayoutOptimizer(dimensions, constraints, {
    populationSize: 200,
    generations: 1000,
    mutationRate: 0.1,
    convergenceThreshold: 0.0001,
  });
  
  return optimizer.optimize();
}
