'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Rubric, Criterion } from '@/models/rubric.schema';

interface ConfigureProps {
  initialRubric: Rubric;
  onComplete: (rubric: Rubric) => void;
  onBack: () => void;
}

export function Configure({ initialRubric, onComplete, onBack }: ConfigureProps) {
  const [criteria, setCriteria] = useState<Criterion[]>(initialRubric.criteria);

  const total = criteria.reduce((sum, c) => sum + c.weight, 0);
  const delta = 100 - total;
  const isValid = total === 100;

  function handleLabelChange(id: string, value: string) {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, label: value } : c))
    );
  }

  function handleWeightChange(id: string, value: string) {
    const parsed = parseFloat(value);
    const weight = isNaN(parsed) ? 0 : parsed;
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, weight } : c))
    );
  }

  function handleRemove(id: string) {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  }

  function handleAdd() {
    const newCriterion: Criterion = {
      id: crypto.randomUUID(),
      label: '',
      weight: 0,
    };
    setCriteria((prev) => [...prev, newCriterion]);
  }

  function handleConfirm() {
    if (!isValid) return;
    onComplete({ criteria });
  }

  return (
    <div className="flex flex-col gap-10 px-6 py-12 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Configure Criteria</h1>
        <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
          Edit labels and weights for each criterion. Weights must sum to 100%.
        </p>
      </div>

      <div className="flex flex-col gap-0 border-2 border-border">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_120px_40px] border-b-2 border-border bg-muted/50 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Criterion
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right pr-6">
            Weight
          </span>
          <span />
        </div>

        {/* Criteria rows */}
        {criteria.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No criteria. Add one below.
          </div>
        ) : (
          criteria.map((criterion, index) => (
            <div
              key={criterion.id}
              className={cn(
                'grid grid-cols-[1fr_120px_40px] items-center gap-2 px-4 py-3',
                index < criteria.length - 1 && 'border-b border-border'
              )}
            >
              {/* Label input */}
              <input
                type="text"
                value={criterion.label}
                onChange={(e) => handleLabelChange(criterion.id, e.target.value)}
                placeholder="Criterion label"
                className="w-full bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent focus-visible:border-ring px-2 py-1.5 transition-colors"
                aria-label={`Label for criterion ${index + 1}`}
              />

              {/* Weight input */}
              <div className="flex items-center justify-end gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={criterion.weight}
                  onChange={(e) => handleWeightChange(criterion.id, e.target.value)}
                  className="w-16 bg-transparent text-sm text-right tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent focus-visible:border-ring px-2 py-1.5 transition-colors"
                  aria-label={`Weight for criterion ${index + 1}`}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(criterion.id)}
                aria-label={`Remove criterion: ${criterion.label || `criterion ${index + 1}`}`}
                className="text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M8 6V4h8v2" />
                </svg>
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Add Criterion */}
      <Button variant="outline" onClick={handleAdd} className="w-full">
        + Add Criterion
      </Button>

      {/* Weight total indicator */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 border-2 text-sm font-semibold',
          isValid
            ? 'border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-400'
            : 'border-destructive/40 bg-destructive/5 text-destructive'
        )}
        role="status"
        aria-live="polite"
      >
        {isValid ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden="true">
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span>Total: 100% — weights are balanced</span>
          </>
        ) : delta > 0 ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              Total: {total}% — <span className="font-bold">{delta}% remaining</span>
            </span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              Total: {total}% — <span className="font-bold">{Math.abs(delta)}% over</span>
            </span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg" className="w-full h-12 text-sm font-semibold">
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!isValid}
          size="lg"
          className="w-full h-12 text-sm font-bold uppercase tracking-wider"
        >
          Confirm Criteria
        </Button>
      </div>
    </div>
  );
}
