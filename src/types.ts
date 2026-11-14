export interface AnalysisResult {
  score: number;
  verdict: string;
  breakdown: { label: string; value: number; weight: string; detail: string }[];
  matched: string[];
  missing: string[];
  requiredSkills: string[];
  resumeSkills: string[];
  counts: {
    resumeWords: number;
    jdWords: number;
    matchedSkills: number;
    missingSkills: number;
    requiredSkills: number;
    actionVerbs: number;
    quantifiedResults: number;
  };
  sections: { key: string; label: string; present: boolean }[];
  actionVerbs: string[];
  suggestions: { category: string; text: string; priority: string }[];
  checklist: string[];
  method: string;
}

export interface SamplePair {
  id: string;
  title: string;
  subtitle: string;
  resume: string;
  jobDescription: string;
}
