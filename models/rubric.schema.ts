import { z } from "zod";
import { AiCriterionSchema, AiRubricResponseSchema } from "@/lib/ai/ai.schemas";

export const CriterionSchema = AiCriterionSchema;
export const RubricSchema = AiRubricResponseSchema;

export type Criterion = z.infer<typeof CriterionSchema>;
export type Rubric = z.infer<typeof RubricSchema>;
