import { z } from "zod";

export const CriterionScoreSchema = z.object({
  criterionId: z.string(),
  criterionLabel: z.string(),
  weight: z.number(),
  score: z.number().min(0).max(100),
  weightedContribution: z.number(),
});

export const ScoredLeadSchema = z.object({
  identifier: z.string(),
  overallScore: z.number().min(0).max(100),
  tier: z.enum(["Strong", "Possible", "Weak"]),
  criterionScores: z.array(CriterionScoreSchema),
  rowData: z.record(z.string(), z.string()),
});

export const ScoringResultSchema = z.object({
  leads: z.array(ScoredLeadSchema),
});

export type CriterionScore = z.infer<typeof CriterionScoreSchema>;
export type ScoredLead = z.infer<typeof ScoredLeadSchema>;
export type ScoringResult = z.infer<typeof ScoringResultSchema>;
