export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  category: string;
  layoutType?: string;
  isRegenerating?: boolean;
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