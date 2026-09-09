export type PreparationSource = { id: string; title: string; url: string; retrievedAt: string };
export type PreparationContent = {
  summary: string;
  findings: { text: string; sourceIds: string[] }[];
  draft: { title: string; body: string };
  remainingSteps: string[];
  uncertainties: string[];
};
export type PreparationResult = PreparationContent & {
  status: 'prepared' | 'needs_you';
  sources: PreparationSource[];
  provider: 'openai';
  model: string;
  searchPerformed: true;
  completedAt: string;
};
export type PreparationTask = {
  id: string;
  choiceKey: string;
  selectedStep: string;
  brief: string;
  consent: 'research-and-draft-v1';
  approvedAt: string;
  updatedAt: string;
  status: 'running' | 'prepared' | 'needs_you' | 'failed' | 'cancelled' | 'interrupted';
  result: PreparationResult | null;
  error: string | null;
};
