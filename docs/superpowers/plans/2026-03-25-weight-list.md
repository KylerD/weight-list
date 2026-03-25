# Weight-List V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lead prioritization tool that uses AI-powered weighted scoring to group uploaded CSV data into tiered buckets (Strong / Possible / Weak).

**Architecture:** Single-page Next.js 16 app with four steps (Describe → Configure → Upload & Map → Results). All state is ephemeral client-side React state. AI calls go through server actions that invoke a single AI service file using Vercel AI SDK with Anthropic provider. CSV parsing is client-side.

**Tech Stack:** Next.js 16, Tailwind v4, shadcn/Radix UI, Vercel AI SDK (`ai` + `@ai-sdk/anthropic`), Zod, PapaParse

**Spec:** `docs/superpowers/specs/2026-03-25-weight-list-design.md`

---

## File Map

```
.env.example                      — CREATE — ANTHROPIC_API_KEY placeholder
.env.local                        — CREATE — actual API key (gitignored)
models/
  rubric.schema.ts                — CREATE — Zod schema + types for criteria/rubric
  mapping.schema.ts               — CREATE — Zod schema + types for column mappings
  scoring.schema.ts               — CREATE — Zod schema + types for scored leads/tiers
lib/
  ai/
    ai.schemas.ts                 — CREATE — Zod schemas for raw AI model output
    ai.service.ts                 — CREATE — generateRubric, mapColumns, scoreLeads
  csv/
    csv.parser.ts                 — CREATE — PapaParse wrapper (client-side)
actions/
  rubric.action.ts                — CREATE — generateRubricAction server action
  mapping.action.ts               — CREATE — mapColumnsAction server action
  scoring.action.ts               — CREATE — scoreLeadsAction server action
app/
  page.tsx                        — MODIFY — step orchestration with client state
  layout.tsx                      — MODIFY — update metadata title/description
  globals.css                     — MODIFY — add any custom CSS variables if needed
  _components/
    describe.tsx                  — CREATE — step 1: text area + generate button
    configure.tsx                 — CREATE — step 2: editable rubric table
    upload-map.tsx                — CREATE — step 3: file upload + mapping review
    results.tsx                   — CREATE — step 4: tiered bucket results
    step-indicator.tsx            — CREATE — step progress indicator
```

---

### Task 1: Install Dependencies and Environment Setup

**Files:**
- Modify: `package.json`
- Create: `.env.example`

- [ ] **Step 1: Install AI SDK and CSV parsing packages**

Run:
```bash
npm install ai @ai-sdk/anthropic zod papaparse
npm install -D @types/papaparse
```

- [ ] **Step 2: Create .env.example**

```
ANTHROPIC_API_KEY=your_api_key_here
```

- [ ] **Step 3: Create .env.local with your actual key**

```
ANTHROPIC_API_KEY=sk-ant-...
```

Verify `.env.local` is in `.gitignore` (it should be by default with Next.js).

- [ ] **Step 4: Verify the dev server still starts**

Run: `npm run dev`
Expected: Dev server starts without errors on localhost:3000.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add AI SDK, Anthropic provider, and PapaParse dependencies"
```

---

### Task 2: AI Schemas (lib/ai/ai.schemas.ts)

**Files:**
- Create: `lib/ai/ai.schemas.ts`

These are the raw shapes the AI model returns. Domain schemas in `models/` re-export or transform from these where they're identical.

- [ ] **Step 1: Create AI output schemas**

Create `lib/ai/ai.schemas.ts`:

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/ai.schemas.ts
git commit -m "feat: add Zod schemas for AI model output shapes"
```

---

### Task 3: Domain Schemas (models/)

**Files:**
- Create: `models/rubric.schema.ts`
- Create: `models/mapping.schema.ts`
- Create: `models/scoring.schema.ts`

Domain schemas re-export from AI schemas where the shapes are identical (per spec schema boundary rule). Only `scoring.schema.ts` defines independent shapes since the scored lead structure (with tiers, weighted contributions, etc.) is computed after AI output.

- [ ] **Step 1: Create rubric schema (re-exports from AI schemas)**

Create `models/rubric.schema.ts`:

```ts
import { z } from "zod";
import { AiCriterionSchema, AiRubricResponseSchema } from "@/lib/ai/ai.schemas";

export const CriterionSchema = AiCriterionSchema;
export const RubricSchema = AiRubricResponseSchema;

export type Criterion = z.infer<typeof CriterionSchema>;
export type Rubric = z.infer<typeof RubricSchema>;
```

- [ ] **Step 2: Create mapping schema (re-exports from AI schemas)**

Create `models/mapping.schema.ts`:

```ts
import { z } from "zod";
import { AiColumnMappingSchema, AiMappingResponseSchema } from "@/lib/ai/ai.schemas";

export const ColumnMappingSchema = AiColumnMappingSchema;
export const MappingResultSchema = AiMappingResponseSchema;

export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;
export type MappingResult = z.infer<typeof MappingResultSchema>;
```

- [ ] **Step 3: Create scoring schema (independent — computed shapes)**

Create `models/scoring.schema.ts`:

```ts
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
  rowData: z.record(z.string()),
});

export const ScoringResultSchema = z.object({
  leads: z.array(ScoredLeadSchema),
});

export type CriterionScore = z.infer<typeof CriterionScoreSchema>;
export type ScoredLead = z.infer<typeof ScoredLeadSchema>;
export type ScoringResult = z.infer<typeof ScoringResultSchema>;
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add models/
git commit -m "feat: add domain Zod schemas for rubric, mapping, and scoring"
```

---

### Task 4: CSV Parser (lib/csv/csv.parser.ts)

**Files:**
- Create: `lib/csv/csv.parser.ts`

- [ ] **Step 1: Create CSV parser wrapper**

Create `lib/csv/csv.parser.ts`:

```ts
import Papa from "papaparse";

export type ParsedCSV = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? [];
        const rows = results.data as Record<string, string>[];
        if (headers.length === 0) {
          reject(new Error("No columns found in CSV"));
          return;
        }
        resolve({ headers, rows });
      },
      error(err) {
        reject(new Error(`CSV parsing failed: ${err.message}`));
      },
    });
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/csv/csv.parser.ts
git commit -m "feat: add client-side CSV parser wrapper around PapaParse"
```

---

### Task 5: AI Service (lib/ai/ai.service.ts)

**Files:**
- Create: `lib/ai/ai.service.ts`

This is the core AI integration. Three functions: `generateRubric`, `mapColumns`, `scoreLeads`.

Check context7 for the latest Vercel AI SDK patterns for `generateObject` and `generateText` with the Anthropic provider before implementing. The key APIs:
- `generateObject({ model, schema, prompt })` from `ai`
- `generateText({ model, prompt, tools })` from `ai`
- `anthropic("claude-sonnet-4-5-20250929")` from `@ai-sdk/anthropic`
- `anthropic.tools.webSearch_20250305({ maxUses: 2 })` from `@ai-sdk/anthropic`

- [ ] **Step 1: Create AI service file with generateRubric**

Create `lib/ai/ai.service.ts`:

```ts
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

  const allScores = await Promise.all(
    batches.map((batch, batchIndex) => scoreBatch(criteria, mappings, identifierColumn, batch, batchIndex * batchSize))
  );

  return allScores.flat();
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

  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    throw new Error("AI did not return a valid JSON block");
  }

  const parsed = AiScoringResponseSchema.parse(JSON.parse(jsonMatch[1]));

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

    const tier = overallScore >= 70 ? "Strong" as const : overallScore >= 40 ? "Possible" as const : "Weak" as const;

    return {
      identifier,
      overallScore,
      tier,
      criterionScores,
      rowData: row ?? {},
    };
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/ai.service.ts
git commit -m "feat: add AI service with generateRubric, mapColumns, and scoreLeads"
```

---

### Task 6: Server Actions

**Files:**
- Create: `actions/rubric.action.ts`
- Create: `actions/mapping.action.ts`
- Create: `actions/scoring.action.ts`

- [ ] **Step 1: Create rubric action**

Create `actions/rubric.action.ts`:

```ts
"use server";

import { z } from "zod";
import { generateRubric } from "@/lib/ai/ai.service";

const GenerateRubricInput = z.object({
  description: z.string().min(10, "Please provide a more detailed description"),
});

export async function generateRubricAction(description: string) {
  const validated = GenerateRubricInput.safeParse({ description });
  if (!validated.success) {
    return { error: validated.error.errors[0].message, data: null };
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
```

- [ ] **Step 2: Create mapping action**

Create `actions/mapping.action.ts`:

```ts
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
```

- [ ] **Step 3: Create scoring action**

Create `actions/scoring.action.ts`:

```ts
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
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add actions/
git commit -m "feat: add server actions for rubric generation, column mapping, and scoring"
```

---

### Task 7: Step Indicator Component

**Files:**
- Create: `app/_components/step-indicator.tsx`

- [ ] **Step 1: Create step indicator**

Create `app/_components/step-indicator.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1, label: "Describe" },
  { number: 2, label: "Configure" },
  { number: 3, label: "Upload & Map" },
  { number: 4, label: "Results" },
];

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Progress" className="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto py-8">
      {STEPS.map((step, i) => {
        const isCompleted = currentStep > step.number;
        const isActive = currentStep === step.number;
        return (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex items-center justify-center w-10 h-10 text-sm font-bold border-2 transition-colors",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isActive && "border-primary text-primary bg-primary/10",
                  !isCompleted && !isActive && "border-muted-foreground/30 text-muted-foreground/50"
                )}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  (isActive || isCompleted) ? "text-foreground" : "text-muted-foreground/50"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-12 h-0.5 mx-2 mb-5",
                  currentStep > step.number ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
```

Design: horizontal layout with numbered squares (matching the sharp/no-border-radius aesthetic of the existing button component), connected by lines. Completed steps show a checkmark, active step has a primary accent, future steps are muted. Accessible via `aria-current="step"` and `aria-label`.

- [ ] **Step 2: Verify it renders**

Import it temporarily into `app/page.tsx` and confirm it renders at `localhost:3000`.

- [ ] **Step 3: Commit**

```bash
git add app/_components/step-indicator.tsx
git commit -m "feat: add step indicator component"
```

---

### Task 8: Step 1 — Describe Component

**Files:**
- Create: `app/_components/describe.tsx`

- [ ] **Step 1: Create describe component**

Create `app/_components/describe.tsx`. This is a `'use client'` component with:

- Large text area (placeholder: "Describe what you're evaluating and what matters most...")
- "Generate Scoring Criteria" button (uses shadcn `Button`)
- Loading state: button shows spinner + "Generating..." while the action is in flight, text area is disabled
- Error state: inline error message below the button with a retry option
- On success: calls `onComplete` prop with the generated rubric

Props:
```ts
{
  onComplete: (rubric: Rubric) => void;
}
```

Calls `generateRubricAction` from `actions/rubric.action.ts`.

Design notes:
- Big, bold heading: "What are you scoring?"
- Generous padding, the text area should feel spacious
- Keep it focused — this is the first thing users see

- [ ] **Step 2: Verify it renders and the action fires**

Wire it up in `app/page.tsx` temporarily. Type a description, hit generate, confirm the action fires (check network tab / server logs). The AI call may fail without a valid API key — that's fine, verify the error state renders.

- [ ] **Step 3: Commit**

```bash
git add app/_components/describe.tsx
git commit -m "feat: add describe step component with rubric generation"
```

---

### Task 9: Step 2 — Configure Component

**Files:**
- Create: `app/_components/configure.tsx`

- [ ] **Step 1: Create configure component**

Create `app/_components/configure.tsx`. This is a `'use client'` component with:

- Table/list of criteria, each row has:
  - Editable label (text input)
  - Editable weight (number input, suffix %)
  - Remove button (trash icon)
- "Add Criterion" button at the bottom
- Weight validation: show current total and delta (e.g., "Total: 85% — 15% remaining" or "Total: 110% — 10% over"). Disable Confirm when total ≠ 100%.
- "Confirm Criteria" button — disabled when weights don't sum to 100%
- New criteria added with default weight of 0% and empty label

Props:
```ts
{
  initialRubric: Rubric;
  onComplete: (rubric: Rubric) => void;
  onBack: () => void;
}
```

All editing is client-side state — no server actions.

Design notes:
- Clean table layout
- Inline editing feels smooth — no modal popups
- Weight total shown prominently
- Color-code the total: green when 100%, red when not

- [ ] **Step 2: Test the editing interactions**

Verify: add/remove criteria, edit labels, edit weights, total updates correctly, Confirm is disabled when total ≠ 100%.

- [ ] **Step 3: Commit**

```bash
git add app/_components/configure.tsx
git commit -m "feat: add configure step component with editable rubric"
```

---

### Task 10: Step 3 — Upload & Map Component

**Files:**
- Create: `app/_components/upload-map.tsx`

- [ ] **Step 1: Create upload-map component**

Create `app/_components/upload-map.tsx`. This is a `'use client'` component with two phases:

**Phase A: Upload**
- Drag-and-drop zone + click-to-upload
- Accepts `.csv` files only
- On file selection: parse client-side using `parseCSV` from `lib/csv/csv.parser.ts`
- Show row count warning if > 200 rows (but don't block — the server action will reject)
- Error state for parse failures
- On success: auto-advance to Phase B

**Phase B: Mapping Review**
- Calls `mapColumnsAction` with criteria + parsed column headers
- Loading state while AI maps columns
- Displays mapping review table: Criterion | Mapped Column (dropdown) | Confidence (badge)
- Identifier column selector at top (dropdown of all columns)
- All mappings are overridable via dropdown (options = all CSV columns + "None")
- "Confirm Mapping" button
- "Back" button to re-upload a different file

Props:
```ts
{
  rubric: Rubric;
  onComplete: (mappings: ColumnMapping[], identifierColumn: string, rows: Record<string, string>[]) => void;
  onBack: () => void;
}
```

Design notes:
- Upload zone should feel inviting — dashed border, icon, clear copy
- Confidence badges: High = green, Medium = amber, Low = red
- The mapping table should be scannable at a glance

- [ ] **Step 2: Test with a sample CSV**

Create a test CSV file manually (e.g. 5 rows of candidate data). Upload it, verify parsing works, verify mappings render with dropdowns.

- [ ] **Step 3: Commit**

```bash
git add app/_components/upload-map.tsx
git commit -m "feat: add upload and column mapping step component"
```

---

### Task 11: Step 4 — Results Component

**Files:**
- Create: `app/_components/results.tsx`

- [ ] **Step 1: Create results component**

Create `app/_components/results.tsx`. This is a `'use client'` component with:

- Calls `scoreLeadsAction` on mount with criteria, mappings, identifier column, and rows
- Loading state: "Scoring X leads..." with progress indication
- Error state with retry button
- Results displayed as three collapsible tier groups:
  - **Strong** (70+) — green accent
  - **Possible** (40-69) — amber accent
  - **Weak** (below 40) — red/muted accent
- Each tier header shows: tier name + count badge
- Each lead card within a tier shows: identifier, overall score
- Expandable breakdown: table of criterion name, weight, individual score, weighted contribution
- "Start Over" button to reset the whole flow

Props:
```ts
{
  rubric: Rubric;
  mappings: ColumnMapping[];
  identifierColumn: string;
  rows: Record<string, string>[];
  onReset: () => void;
}
```

Design notes:
- Tier groups should feel distinct — use color and whitespace
- Score should be prominent on each lead card
- The expandable breakdown should be a clean sub-table
- Celebrate the "Strong" tier — make it feel like a win

- [ ] **Step 2: Test end-to-end with sample data**

Run through the full flow: describe → configure → upload CSV → review results. Verify tier grouping is correct based on scores.

- [ ] **Step 3: Commit**

```bash
git add app/_components/results.tsx
git commit -m "feat: add results step component with tiered bucket display"
```

---

### Task 12: Page Orchestration (app/page.tsx)

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update layout metadata**

In `app/layout.tsx`, update the metadata:

```ts
export const metadata: Metadata = {
  title: "Weight-List — AI-Powered Lead Scoring",
  description: "Prioritize inbound leads with AI-powered weighted scoring",
};
```

- [ ] **Step 2: Rewrite page.tsx as step orchestrator**

Rewrite `app/page.tsx` as a `'use client'` component that:

- Manages current step (1-4) via `useState`
- Stores rubric, mappings, identifierColumn, parsed CSV rows in state
- Renders `StepIndicator` at the top
- Conditionally renders the active step component
- Passes appropriate `onComplete` / `onBack` / `onReset` callbacks
- `onReset` clears all state and goes back to step 1

The page should have a clean layout: step indicator at top, step content centered with max-width, generous vertical spacing.

- [ ] **Step 3: Test full flow**

Run: `npm run dev`
Walk through all four steps. Verify:
- Step transitions work
- Back buttons work
- Data passes correctly between steps
- Reset works

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: wire up page orchestration with step state management"
```

---

### Task 13: Visual Polish and Design

**Files:**
- Modify: all `app/_components/*.tsx` files
- Potentially modify: `app/globals.css`

This is the design pass. Go through each component and apply bold, clean, accessible design. Reference the `@teach-impeccable` and `@frontend-design` skills for design guidance.

- [ ] **Step 1: Typography and spacing**

Ensure consistent heading hierarchy, generous whitespace, and clear visual rhythm across all steps.

- [ ] **Step 2: Color and emphasis**

Apply strong color accents for tier badges, confidence levels, and interactive elements. Dark mode support via Tailwind's `dark:` variants.

- [ ] **Step 3: Accessibility audit**

Check: all interactive elements have focus states, form inputs have labels, color is not the only indicator (use icons/text too), keyboard navigation works through the full flow.

- [ ] **Step 4: Test the full flow visually**

Walk through every step, check both light and dark mode, verify nothing looks broken at common viewport widths (mobile, tablet, desktop).

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: apply visual polish — typography, color, spacing, accessibility"
```

---

### Task 14: End-to-End Smoke Test

- [ ] **Step 1: Create a realistic sample CSV**

Create a CSV with ~20 rows of realistic data (e.g. job candidates with name, years experience, portfolio URL, location, salary expectation, etc.).

- [ ] **Step 2: Run the full flow**

1. Start dev server: `npm run dev`
2. Step 1: Describe a hiring scenario
3. Step 2: Review and tweak the generated criteria
4. Step 3: Upload the sample CSV, review mappings
5. Step 4: Verify results appear in correct tiers

- [ ] **Step 3: Test error states**

1. Submit empty description — verify validation error
2. Upload a non-CSV file — verify parse error
3. Temporarily break the API key — verify AI error + retry

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete Weight-List V1 — AI-powered lead scoring tool"
```
