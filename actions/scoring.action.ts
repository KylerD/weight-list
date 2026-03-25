"use server";

import { scoreLeads } from "@/lib/ai/ai.service";
import type { Criterion } from "@/models/rubric.schema";
import type { ColumnMapping } from "@/models/mapping.schema";

const MAX_ROWS = 200;

export async function scoreLeadsAction(
  criteria: Criterion[],
  mappings: ColumnMapping[],
  identifierColumn: string,
  rows: Record<string, string>[]
) {
  if (rows.length === 0) {
    return { error: "No data to score", data: null };
  }
  if (rows.length > MAX_ROWS) {
    return {
      error: `Too many rows (${rows.length}). Maximum is ${MAX_ROWS}.`,
      data: null,
    };
  }

  try {
    const leads = await scoreLeads(criteria, mappings, identifierColumn, rows);
    return { error: null, data: { leads } };
  } catch (err) {
    console.error("actions/scoring.action.ts/scoreLeadsAction:", err);
    return { error: "Something went wrong. Please try again.", data: null };
  }
}
