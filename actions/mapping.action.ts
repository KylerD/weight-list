"use server";

import { z } from "zod";
import { mapColumns } from "@/lib/ai/ai.service";
import type { Criterion } from "@/models/rubric.schema";
import { CriterionSchema } from "@/models/rubric.schema";

export async function mapColumnsAction(
  criteria: Criterion[],
  csvColumns: string[]
) {
  const validatedCriteria = z.array(CriterionSchema).safeParse(criteria);
  if (!validatedCriteria.success) {
    return { error: "Invalid criteria data", data: null };
  }
  const validatedColumns = z.array(z.string()).safeParse(csvColumns);
  if (!validatedColumns.success) {
    return { error: "Invalid column data", data: null };
  }

  if (validatedCriteria.data.length === 0) {
    return { error: "No criteria provided", data: null };
  }
  if (validatedColumns.data.length === 0) {
    return { error: "No CSV columns found", data: null };
  }

  try {
    const result = await mapColumns(validatedCriteria.data, validatedColumns.data);
    return { error: null, data: result };
  } catch (err) {
    console.error("actions/mapping.action.ts/mapColumnsAction:", err);
    return { error: "Something went wrong. Please try again.", data: null };
  }
}
