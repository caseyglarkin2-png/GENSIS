/**
 * STREAMLINED ONBOARDING WIZARD
 * 
 * Gets customers from zero to productive in < 10 minutes
 * - No reading manuals
 * - Start with templates
 * - Guided data import
 * - Instant value
 */

import { Organization, NetworkTemplate, Network } from '@prisma/client';

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  estimatedTime: string; // "2 min"
  isRequired: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: "Tell us about your business",
    description: "Select your industry and business type",
    estimatedTime: "30 sec",
    isRequired: true
  },
  {
    id: 2,
    title: "Choose a template",
    description: "Start with a proven configuration",
    estimatedTime: "1 min",
    isRequired: true
  },
  {
    id: 3,
    title: "Add your first facility",
    description: "Quick add or bulk import",
    estimatedTime: "2 min",
    isRequired: true
  },
  {
    id: 4,
    title: "Set ROI parameters",
    description: "Use defaults or customize",
    estimatedTime: "1 min",
    isRequired: false
  },
  {
    id: 5,
    title: "Invite your team",
    description: "Add collaborators (optional)",
    estimatedTime: "1 min",
    isRequired: false
  }
];

export interface BusinessProfile {
  industry: 'logistics' | 'retail' | 'manufacturing' | '3pl' | 'distribution' | 'other';
  companySize: 'small' | 'medium' | 'large' | 'enterprise';
  primaryGoal: 'optimize_operations' | 'reduce_costs' | 'improve_visibility' | 'expand_network';
  networkSize: 'single' | 'regional' | 'national' | 'international';
}

export interface QuickAddFacility {
  name: string;
  address: string;
  facilityType: string;
  // Automatically geocoded and populated with template defaults
}

/**
 * TEMPLATE RECOMMENDATIONS
 * AI-powered template matching based on business profile
 */
export interface TemplateRecommendation {
  template: NetworkTemplate;
  matchScore: number; // 0-100
  reasons: string[];
  estimatedSetupTime: string;
  successRate: number; // % of similar customers who succeeded
}

export function recommendTemplates(
  profile: BusinessProfile,
  availableTemplates: NetworkTemplate[]
): TemplateRecommendation[] {
  // AI matching algorithm
  const scored = availableTemplates.map(template => {
    let score = 0;
    const reasons: string[] = [];
    
    // Industry match
    if (template.industry === profile.industry) {
      score += 40;
      reasons.push(`Optimized for ${profile.industry} operations`);
    }
    
    // Goal alignment
    if (profile.primaryGoal === 'optimize_operations' && template.facilityTypes.includes('distribution_center')) {
      score += 20;
      reasons.push('Includes best practices for operational optimization');
    }
    
    // Network size
    if (profile.networkSize === 'national' && template.timesUsed > 50) {
      score += 15;
      reasons.push('Proven with large-scale networks');
    }
    
    // Popularity
    if (template.isFeatured) {
      score += 10;
      reasons.push('Most popular template');
    }
    
    // Usage success
    if (template.timesUsed > 100) {
      score += 15;
      reasons.push('Used successfully by 100+ organizations');
    }
    
    return {
      template,
      matchScore: Math.min(score, 100),
      reasons,
      estimatedSetupTime: score > 70 ? '5 min' : '10 min',
      successRate: template.timesUsed > 50 ? 92 : 85
    };
  });
  
  return scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

/**
 * SMART DATA IMPORT
 * Multiple easy ways to get data in
 */
export interface ImportMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  estimatedTime: string;
  supportedFormats?: string[];
}

export const IMPORT_METHODS: ImportMethod[] = [
  {
    id: 'quick-add',
    name: 'Quick Add',
    description: 'Type address, we handle the rest',
    icon: 'zap',
    difficulty: 'easy',
    estimatedTime: '30 sec per facility'
  },
  {
    id: 'spreadsheet',
    name: 'Spreadsheet Upload',
    description: 'CSV or Excel - drag and drop',
    icon: 'file-spreadsheet',
    difficulty: 'easy',
    estimatedTime: '2 min for 50 facilities',
    supportedFormats: ['.csv', '.xlsx', '.xls']
  },
  {
    id: 'copy-paste',
    name: 'Copy & Paste',
    description: 'Paste addresses from any source',
    icon: 'clipboard',
    difficulty: 'easy',
    estimatedTime: '1 min for 10 facilities'
  },
  {
    id: 'api',
    name: 'API Integration',
    description: 'Connect your TMS or WMS',
    icon: 'plug',
    difficulty: 'advanced',
    estimatedTime: '5 min setup'
  },
  {
    id: 'google-maps',
    name: 'Import from Google Maps',
    description: 'Paste a Google Maps list URL',
    icon: 'map-pin',
    difficulty: 'easy',
    estimatedTime: '1 min'
  }
];

/**
 * INSTANT VALUE - Show ROI immediately
 */
export interface QuickWin {
  title: string;
  description: string;
  value: string;
  timeToRealize: string;
  confidence: 'high' | 'medium' | 'low';
}

export function generateQuickWins(network: Network): QuickWin[] {
  return [
    {
      title: 'Visibility Achieved',
      description: 'All facilities mapped and accessible',
      value: '100% network visibility',
      timeToRealize: 'Immediate',
      confidence: 'high'
    },
    {
      title: 'Baseline Established',
      description: 'Ready for optimization analysis',
      value: 'Network benchmark created',
      timeToRealize: 'Immediate',
      confidence: 'high'
    },
    {
      title: 'Share with Team',
      description: 'Collaborative view ready',
      value: 'Real-time collaboration enabled',
      timeToRealize: 'Immediate',
      confidence: 'high'
    }
  ];
}

/**
 * CONTEXTUAL HELP
 * AI assistant that understands where user is
 */
export interface HelpContext {
  currentStep: number;
  suggestions: string[];
  commonIssues: { problem: string; solution: string; }[];
  videoTutorialUrl?: string;
}

export function getContextualHelp(step: number): HelpContext {
  const helpMap: Record<number, HelpContext> = {
    1: {
      currentStep: 1,
      suggestions: [
        "Select the industry that best matches your operations",
        "Company size helps us recommend the right features",
        "Your goal helps prioritize insights"
      ],
      commonIssues: [
        {
          problem: "Not sure which industry to select?",
          solution: "Choose 'logistics' if you move freight, '3pl' if you provide services to others"
        }
      ]
    },
    2: {
      currentStep: 2,
      suggestions: [
        "Templates include best-practice metrics and ROI calculations",
        "You can customize everything after selecting",
        "See what similar companies use"
      ],
      commonIssues: [
        {
          problem: "Don't see a perfect match?",
          solution: "Choose the closest template - you can fully customize it"
        }
      ]
    },
    3: {
      currentStep: 3,
      suggestions: [
        "Quick Add: Just type the address",
        "Bulk Import: Upload CSV with Name, Address columns",
        "We'll auto-geocode and enrich the data"
      ],
      commonIssues: [
        {
          problem: "Address not found?",
          solution: "Try adding city and state, or click map to place manually"
        }
      ]
    }
  };
  
  return helpMap[step] || { currentStep: step, suggestions: [], commonIssues: [] };
}

/**
 * PROGRESS TRACKING
 * Show users they're making progress
 */
export interface OnboardingProgress {
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
  estimatedTimeRemaining: string;
  nextMilestone: string;
}

export function calculateProgress(completedSteps: number[]): OnboardingProgress {
  const required = ONBOARDING_STEPS.filter(s => s.isRequired);
  const completed = completedSteps.filter(id => 
    ONBOARDING_STEPS.find(s => s.id === id)?.isRequired
  );
  
  const percentComplete = Math.round((completed.length / required.length) * 100);
  const remainingSteps = required.filter(s => !completedSteps.includes(s.id));
  const timeRemaining = remainingSteps.reduce((acc, step) => {
    const minutes = parseInt(step.estimatedTime);
    return acc + (isNaN(minutes) ? 2 : minutes);
  }, 0);
  
  return {
    completedSteps: completed.length,
    totalSteps: required.length,
    percentComplete,
    estimatedTimeRemaining: `${timeRemaining} min`,
    nextMilestone: remainingSteps[0]?.title || 'Complete!'
  };
}
