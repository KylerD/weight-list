"use server";

import { mapColumns } from "@/lib/ai/ai.service";
import type { Criterion } from "@/models/rubric.schema";

export async function mapColumnsAction(
  criteria: Criterion[],
  csvColumns: string[]
) {
  if (criteria.length === 0) {
    return { error: "No criteria provided", data: null };
  }
  if (csvColumns.length === 0) {
    return { error: "No CSV columns found", data: null };
  }

  try {
    const result = await mapColumns(criteria, csvColumns);
    return { error: null, data: result };
  } catch (err) {
    console.error("actions/mapping.action.ts/mapColumnsAction:", err);
    return { error: "Something went wrong. Please try again.", data: null };
  }
}
