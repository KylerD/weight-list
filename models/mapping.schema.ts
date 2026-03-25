import { z } from "zod";
import { AiColumnMappingSchema, AiMappingResponseSchema } from "@/lib/ai/ai.schemas";

export const ColumnMappingSchema = AiColumnMappingSchema;
export const MappingResultSchema = AiMappingResponseSchema;

export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;
export type MappingResult = z.infer<typeof MappingResultSchema>;
