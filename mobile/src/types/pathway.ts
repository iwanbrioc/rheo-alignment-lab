import type { PathwayBrief, PathwaySuggestion } from '../../pathway_contract.mjs';

export type PathwayStatus = 'idea' | 'trying' | 'helped' | 'needs_care' | 'paused';
export type PathwayReview = {
  id: string;
  createdAt: string;
  status: PathwayStatus;
  happened: string;
  felt: string;
  burden: string;
  remains: string;
};
export type Pathway = PathwayBrief & {
  id: string;
  createdAt: string;
  updatedAt: string;
  nextStep: string;
  status: PathwayStatus;
  suggestion: PathwaySuggestion | null;
  reviews: PathwayReview[];
};
