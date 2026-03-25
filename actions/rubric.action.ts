"use server";

import { z } from "zod";
import { generateRubric } from "@/lib/ai/ai.service";

const GenerateRubricInput = z.object({
  description: z.string().min(10, "Please provide a more detailed description"),
});

export async function generateRubricAction(description: string) {
  const validated = GenerateRubricInput.safeParse({ description });
  if (!validated.success) {
    return { error: validated.error.issues[0].message, data: null };
  }

  try {
    const rubric = await generateRubric(validated.data.description);

    const totalWeight = rubric.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.5) {
      const normalized = rubric.criteria.map((c) => ({
        ...c,
        weight: Math.round((c.weight / totalWeight) * 100),
      }));
      const diff = 100 - normalized.reduce((sum, c) => sum + c.weight, 0);
      if (diff !== 0) normalized[0].weight += diff;
      return { error: null, data: { criteria: normalized } };
    }

    return { error: null, data: rubric };
  } catch (err) {
    console.error("actions/rubric.action.ts/generateRubricAction:", err);
    return { error: "Something went wrong. Please try again.", data: null };
  }
}
