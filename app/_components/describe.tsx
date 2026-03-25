'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateRubricAction } from '@/actions/rubric.action';
import { Rubric } from '@/models/rubric.schema';

interface DescribeProps {
  onComplete: (rubric: Rubric) => void;
}

export function Describe({ onComplete }: DescribeProps) {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setIsLoading(true);
    try {
      const result = await generateRubricAction(description);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        onComplete(result.data);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-10 px-6 py-12 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">What are you scoring?</h1>
        <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
          Describe what you&apos;re evaluating and we&apos;ll generate a weighted scoring rubric.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="evaluation-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </label>
          <textarea
            id="evaluation-description"
            className="w-full min-h-[200px] resize-y border-2 border-border bg-background px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            rows={8}
            placeholder="e.g. I need to score inbound sales leads based on company size, budget, timeline, and technical fit..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !description.trim()}
            size="lg"
            className="w-full h-12 text-sm font-bold uppercase tracking-wider"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin size-4 shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              'Generate Scoring Criteria'
            )}
          </Button>

          {error && (
            <div role="alert" className="flex items-center justify-between gap-3 px-4 py-3 border-2 border-destructive/40 bg-destructive/5 text-destructive text-sm">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="shrink-0 font-bold underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 transition-opacity"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
