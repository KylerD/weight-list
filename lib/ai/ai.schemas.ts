import { z } from "zod";

export const AiCriterionSchema = z.object({
  id: z.string().describe("Unique identifier for this criterion"),
  label: z.string().describe("Human-readable name for this criterion"),
  weight: z.number().describe("Percentage weight (all weights must sum to 100)"),
});

export const AiRubricResponseSchema = z.object({
  criteria: z.array(AiCriterionSchema).describe("Scoring criteria with weights summing to 100"),
});

export const AiColumnMappingSchema = z.object({
  criterionId: z.string().describe("ID of the criterion this maps to"),
  criterionLabel: z.string().describe("Label of the criterion"),
  csvColumn: z.string().nullable().describe("The CSV column name that best matches this criterion, or null if no match"),
  confidence: z.enum(["High", "Medium", "Low"]).describe("How confident the mapping is"),
});

export const AiMappingResponseSchema = z.object({
  mappings: z.array(AiColumnMappingSchema),
  identifierColumn: z.string().describe("The CSV column that best identifies each row (e.g. name, company, email)"),
});

export const AiLeadScoreSchema = z.object({
  rowIndex: z.number().describe("Zero-based index of the row in the batch"),
  scores: z.array(
    z.object({
      criterionId: z.string(),
      score: z.number().min(0).max(100).describe("Score from 0-100 for this criterion"),
    })
  ),
});

export const AiScoringResponseSchema = z.object({
  scoredLeads: z.array(AiLeadScoreSchema),
});
