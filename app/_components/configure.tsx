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
    <div className="flex flex-col gap-8 px-6 py-10 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configure Scoring Criteria</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Edit labels and weights for each criterion. Weights must sum to 100%.
        </p>
      </div>

      <div className="flex flex-col gap-0 border border-border">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_120px_40px] border-b border-border bg-muted/40 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Criterion
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right pr-6">
            Weight
          </span>
          <span />
        </div>

        {/* Criteria rows */}
        {criteria.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No criteria. Add one below.
          </div>
        ) : (
          criteria.map((criterion, index) => (
            <div
              key={criterion.id}
              className={cn(
                'grid grid-cols-[1fr_120px_40px] items-center gap-2 px-3 py-2',
                index < criteria.length - 1 && 'border-b border-border'
              )}
            >
              {/* Label input */}
              <input
                type="text"
                value={criterion.label}
                onChange={(e) => handleLabelChange(criterion.id, e.target.value)}
                placeholder="Criterion label"
                className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-transparent focus-visible:border-ring px-2 py-1 transition-colors"
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
                  className="w-16 bg-transparent text-sm text-right focus:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-transparent focus-visible:border-ring px-2 py-1 transition-colors"
                  aria-label={`Weight for criterion ${index + 1}`}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(criterion.id)}
                aria-label={`Remove criterion ${index + 1}`}
                className="text-muted-foreground hover:text-destructive"
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
          'px-4 py-3 border text-sm font-semibold',
          isValid
            ? 'border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-400'
            : 'border-destructive/40 bg-destructive/5 text-destructive'
        )}
        aria-live="polite"
      >
        {isValid ? (
          <span>Total: 100% — weights are balanced</span>
        ) : delta > 0 ? (
          <span>
            Total: {total}% — <span className="font-bold">{delta}% remaining</span>
          </span>
        ) : (
          <span>
            Total: {total}% — <span className="font-bold">{Math.abs(delta)}% over</span>
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="w-full">
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!isValid}
          className="w-full font-semibold"
        >
          Confirm Criteria
        </Button>
      </div>
    </div>
  );
}
