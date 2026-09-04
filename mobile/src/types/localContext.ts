export type LocalContextApiCandidate = {
  id: string;
  name: string;
  category: string;
  distanceM: number | null;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source: string;
  sourceUrl: string | null;
  whyRelevant: string;
};

export type LocalContextApiResponse = {
  provider: string;
  attribution: string | null;
  retrievedAt: string;
  areaLabel: string | null;
  searchQueries: string[];
  candidates: LocalContextApiCandidate[];
  warnings: string[];
};

export type LocalContextCandidate = {
  id: string;
  name: string;
  category: string;
  distanceM: number | null;
  address: string | null;
  source: string;
  sourceUrl: string | null;
  whyRelevant: string;
};

export type LocalContextSnapshot = {
  provider: string;
  attribution: string | null;
  retrievedAt: string;
  areaLabel: string | null;
  searchQueries: string[];
  candidates: LocalContextCandidate[];
  warnings: string[];
};
