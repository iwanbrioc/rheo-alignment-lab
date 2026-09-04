import type { LocalContextSnapshot } from './localContext';

export type ActionKind = 'smallest_release' | 'learning_action' | 'generative_action';

export type RecommendationAction = {
  id: string;
  kind: ActionKind | string;
  title: string;
  action: string;
  whyThisAction: string;
  falsifierOrChangeSignal: string;
  horizonTriplet?: string | null;
  observedRelationship?: string;
  discriminatingQuestion?: string;
  waysToWellbeing?: string[];
  prediction?: {
    whatShouldBecomeMorePossible?: string;
    observableSignal?: string;
    reviewHorizon?: string;
  };
  displacedCosts?: string[];
  irreversibilityCaution?: string;
  assumptions?: string[];
};

export type RecommendationMeta = {
  provider: string | null;
  model: string | null;
  responseId: string | null;
  researchUsable: boolean | null;
};

export type RecommendationSnapshot = {
  id: string;
  caseId: string;
  createdAt: string;
  flow: unknown;
  flowMeta: RecommendationMeta;
  actionMeta: RecommendationMeta;
  actions: RecommendationAction[];
};

export type DecisionChoice =
  | {
      kind: 'recommended';
      actionId: string;
      capturedAt: string;
    }
  | {
      kind: 'custom';
      text: string;
      capturedAt: string;
    }
  | {
      kind: 'not_yet';
      capturedAt: string;
    };

export type ResearchArm = null | 'neutral_base' | 'neutral_transition' | 'rheocratic_transition';

export type DecisionSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  situation: string;
  locationUsed: boolean;
  areaLabel: string | null;
  localContext: LocalContextSnapshot | null;
  recommendation: RecommendationSnapshot | null;
  choice: DecisionChoice | null;
  researchArm: ResearchArm;
};
