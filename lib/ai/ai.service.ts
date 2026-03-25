import { generateObject, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  AiRubricResponseSchema,
  AiMappingResponseSchema,
  AiScoringResponseSchema,
} from "./ai.schemas";
import type { Criterion } from "@/models/rubric.schema";
import type { ColumnMapping } from "@/models/mapping.schema";

const model = anthropic("claude-sonnet-4-5-20250929");

export async function generateRubric(description: string) {
  const { object } = await generateObject({
    model,
    schema: AiRubricResponseSchema,
    prompt: `You are an expert at evaluating and prioritizing inbound leads, candidates, suppliers, and other entities.

Based on the following description, generate a set of weighted scoring criteria. Each criterion should have a unique id (kebab-case), a human-readable label, and a percentage weight. All weights MUST sum to exactly 100.

Generate between 3 and 8 criteria that are most relevant to the description.

Description:
${description}`,
  });

  return object;
}

export async function mapColumns(
  criteria: Criterion[],
  csvColumns: string[]
) {
  const { object } = await generateObject({
    model,
    schema: AiMappingResponseSchema,
    prompt: `You are mapping CSV columns to scoring criteria. For each criterion, find the CSV column that best provides data for evaluating that criterion. If no column is a good match, set csvColumn to null.

Also identify which CSV column best serves as a human-readable identifier for each row (e.g. a name, company name, email, or title).

Scoring criteria:
${criteria.map((c) => `- ${c.id}: ${c.label} (weight: ${c.weight}%)`).join("\n")}

Available CSV columns:
${csvColumns.map((col) => `- ${col}`).join("\n")}`,
  });

  return object;
}

export async function scoreLeads(
  criteria: Criterion[],
  mappings: ColumnMapping[],
  identifierColumn: string,
  rows: Record<string, string>[]
) {
  const batchSize = 10;
  const batches: Record<string, string>[][] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }

  const results = await Promise.allSettled(
    batches.map((batch, batchIndex) =>
      scoreBatch(criteria, mappings, identifierColumn, batch, batchIndex * batchSize)
    )
  );

  return results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof scoreBatch>>> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

async function scoreBatch(
  criteria: Criterion[],
  mappings: ColumnMapping[],
  identifierColumn: string,
  rows: Record<string, string>[],
  startIndex: number
) {
  const criteriaDescription = criteria
    .map((c) => {
      const mapping = mappings.find((m) => m.criterionId === c.id);
      const col = mapping?.csvColumn ?? "no mapped column";
      return `- ${c.label} (weight: ${c.weight}%, data from column: "${col}")`;
    })
    .join("\n");

  const rowsDescription = rows
    .map((row, i) => {
      const identifier = row[identifierColumn] ?? `Row ${startIndex + i + 1}`;
      const data = Object.entries(row)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");
      return `Row ${i} (${identifier}):\n${data}`;
    })
    .join("\n\n");

  const { text } = await generateText({
    model,
    tools: {
      web_search: anthropic.tools.webSearch_20250305({ maxUses: 2 }),
    },
    prompt: `You are scoring leads/candidates/entities against weighted criteria. For each row, evaluate how well it matches each criterion on a 0-100 scale.

You may use web search to look up additional context about a lead (e.g. company website, LinkedIn profile) if it would help produce more accurate scores. Only search when the data in the row is insufficient.

Scoring criteria:
${criteriaDescription}

Rows to score:
${rowsDescription}

IMPORTANT: Respond with ONLY a JSON block in this exact format, no other text:
\`\`\`json
{
  "scoredLeads": [
    {
      "rowIndex": 0,
      "scores": [
        { "criterionId": "criterion-id", "score": 85 }
      ]
    }
  ]
}
\`\`\``,
  });

  let parsed;
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error("AI did not return a valid JSON block");
    }
    parsed = AiScoringResponseSchema.parse(JSON.parse(jsonMatch[1]));
  } catch (err) {
    throw new Error(`Failed to parse scoring response: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  return parsed.scoredLeads.map((lead) => {
    const row = rows[lead.rowIndex];
    const identifier = row?.[identifierColumn] ?? `Row ${startIndex + lead.rowIndex + 1}`;

    const criterionScores = lead.scores.map((s) => {
      const criterion = criteria.find((c) => c.id === s.criterionId);
      const weight = criterion?.weight ?? 0;
      const weightedContribution = (s.score * weight) / 100;
      return {
        criterionId: s.criterionId,
        criterionLabel: criterion?.label ?? s.criterionId,
        weight,
        score: s.score,
        weightedContribution,
      };
    });

    const overallScore = Math.round(
      criterionScores.reduce((sum, cs) => sum + cs.weightedContribution, 0)
    );

    const tier =
      overallScore >= 70
        ? ("Strong" as const)
        : overallScore >= 40
        ? ("Possible" as const)
        : ("Weak" as const);

    return {
      identifier,
      overallScore,
      tier,
      criterionScores,
      rowData: row ?? {},
    };
  });
}
