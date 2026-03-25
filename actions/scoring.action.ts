"use server";

import { z } from "zod";
import { scoreLeads } from "@/lib/ai/ai.service";
import type { Criterion } from "@/models/rubric.schema";
import { CriterionSchema } from "@/models/rubric.schema";
import type { ColumnMapping } from "@/models/mapping.schema";
import { ColumnMappingSchema } from "@/models/mapping.schema";

const MAX_ROWS = 200;

export async function scoreLeadsAction(
  criteria: Criterion[],
  mappings: ColumnMapping[],
  identifierColumn: string,
  rows: Record<string, string>[]
) {
  const validatedCriteria = z.array(CriterionSchema).safeParse(criteria);
  if (!validatedCriteria.success) {
    return { error: "Invalid criteria data", data: null };
  }
  const validatedMappings = z.array(ColumnMappingSchema).safeParse(mappings);
  if (!validatedMappings.success) {
    return { error: "Invalid mappings data", data: null };
  }
  const validatedIdentifier = z.string().min(1).safeParse(identifierColumn);
  if (!validatedIdentifier.success) {
    return { error: "Invalid identifier column", data: null };
  }
  const validatedRows = z.array(z.record(z.string(), z.string())).safeParse(rows);
  if (!validatedRows.success) {
    return { error: "Invalid row data", data: null };
  }

  if (validatedRows.data.length === 0) {
    return { error: "No data to score", data: null };
  }
  if (validatedRows.data.length > MAX_ROWS) {
    return {
      error: `Too many rows (${validatedRows.data.length}). Maximum is ${MAX_ROWS}.`,
      data: null,
    };
  }

  try {
    const leads = await scoreLeads(
      validatedCriteria.data,
      validatedMappings.data,
      validatedIdentifier.data,
      validatedRows.data
    );
    return { error: null, data: { leads } };
  } catch (err) {
    console.error("actions/scoring.action.ts/scoreLeadsAction:", err);
    return { error: "Something went wrong. Please try again.", data: null };
  }
}
