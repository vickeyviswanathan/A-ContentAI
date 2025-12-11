
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  category: string;
  layoutType?: string;
  isRegenerating?: boolean;
  timestamp?: number;
}

export type BrandVibe = 'Clean & Clinical' | 'Natural & Organic' | 'Luxury & Minimal' | 'Bold & High Contrast';

export interface ProductContext {
  productName: string;
  targetAudience: string;
  keyFeatures: string;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  RESEARCHING = 'RESEARCHING',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface PromptItem {
  category: string;
  visualPrompt: string;
  layoutType: 'SPLASH' | 'FLATLAY' | 'NEGATIVE_SPACE' | 'MACRO' | 'LIFESTYLE' | 'INFOGRAPHIC' | 'BENEFIT_MAP' | 'INGREDIENT_LIST';
}

// Studio Specific Types
export interface StudioConfig {
  theme: string;
  lighting: string;
  composition: string;
  elements: string[];
  referenceImage?: string; // base64
  background: string;
  customInstructions?: string;
  matchBrandVibe?: boolean; // New field for brand matching
}

export type StudioShotType = 
  | 'HERO' 
  | 'TEXTURE' 
  | 'INGREDIENTS' 
  | 'HOW_TO' 
  | 'SIZE' 
  | 'RANGE' 
  | 'BEFORE_AFTER' 
  | 'SCIENTIFIC';

export const STUDIO_THEMES = [
  { id: 'MINIMALIST', label: 'Minimalist', color: 'bg-gray-100' },
  { id: 'BOTANICAL', label: 'Botanical', color: 'bg-green-100' },
  { id: 'HIGH_TECH', label: 'High-Tech', color: 'bg-blue-100' },
  { id: 'LUXURY_GOLD', label: 'Luxury Gold', color: 'bg-yellow-100' },
  { id: 'NEON_POP', label: 'Neon Pop', color: 'bg-purple-100' },
  { id: 'CLINICAL', label: 'Clinical', color: 'bg-white border' },
];

export const STUDIO_LIGHTING = [
  'Soft Daylight', 'Studio Flash', 'Moody Shadow', 'Golden Hour', 'Neon Rim Light'
];

export const STUDIO_COMPOSITIONS = [
  'Centered', 'Rule of Thirds', 'Low Angle', 'Top Down (Flatlay)', 'Close Up'
];

export const STUDIO_ELEMENTS = [
  'Water Splash', 'Marble Stone', 'Tropical Leaves', 'Lab Glassware', 
  'Silk Fabric', 'Wooden Podium', 'Mirrors', 'Floating Bubbles'
];

export const STUDIO_BACKGROUNDS = [
  'Solid Color', 'Gradient', 'Bathroom Counter', 'Kitchen Counter', 
  'Nature/Outdoors', 'Abstract 3D', 'Lab Setting'
];

export const SCIENTIFIC_TRUST_OPTIONS = [
  { id: 'CLINICAL_LAB', label: 'Clinical Lab (Microscopes)' },
  { id: 'MOLECULAR', label: 'Molecular (3D DNA/Molecules)' },
  { id: 'DERMATOLOGIST', label: 'Dermatologist Seal/Stethoscope' },
  { id: 'PURE_NATURE', label: 'Pure Nature (Mortar & Pestle)' },
];
