export type Confidence = { level: 'low' | 'medium' | 'high'; basis: string };
export type ExperimentalHypothesis = {
  id: string; statement: string; predictedObservation: string; confidence: Confidence;
  triplet: string | null; discriminatingQuestion: string; falsifierOrRelocation: string;
};
export type ExperimentalFlow = {
  schemaVersion: '0.10-experimental'; caseId: string; summary: string;
  hypotheses: ExperimentalHypothesis[];
  generatingRestriction: { observedRelationship: string; hypothesisId: string | null };
  availableAgency: { influenceNow: string; limits: string };
  systemAgency: { actor: string; changeRequired: string; uncertainty: string }[];
  safeguards: { safetyLevel: string; powerAndExit: string; urgentNeedsAndDeadlines: string };
  modelUpdate: { status: string; mismatch: string; explanation: string; previousRecommendationId: string | null };
};
export type DistributionalEffect = {
  whoActs: string; whoBenefits: string; whoBearsBurden: string; displacedBurden: string; compensatingForSystemFailure: string;
};
export type OutcomeFields = {
  actualAction: string; happened: string; becamePossible: string; unchanged: string;
  burden: string; mismatchOrNewExplanation: string;
};
export type OutcomeReview = OutcomeFields & {
  id: string; createdAt: string; recommendationId: string; chosenAction: string; expectedObservation: string;
};
export type ReviewInput = OutcomeFields & {
  previousRecommendationId: string;
  previousHypotheses: Pick<ExperimentalHypothesis, 'id' | 'statement' | 'predictedObservation' | 'confidence'>[];
  chosenAction: string; expectedObservation: string;
};

// Future provider capability only. An area fact never establishes a person's circumstances.
export type AreaContextEvidence = {
  scope: 'area_context'; subjectArea: string; observation: string;
  category: 'transport' | 'public_space' | 'resources' | 'services' | 'accessibility' | 'environment';
  source: string; sourceUrl: string; retrievedAt: string; observedAt: string | null;
  geographicCoverage: string; limitations: string[];
};
