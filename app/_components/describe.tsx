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
    <div className="flex flex-col gap-8 px-6 py-10 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">What are you scoring?</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Describe what you&apos;re evaluating and we&apos;ll generate a weighted scoring rubric.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <textarea
          className="w-full min-h-[180px] resize-y border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          rows={8}
          placeholder="Describe what you're evaluating and what matters most..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
          aria-label="Evaluation description"
        />

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !description.trim()}
            size="lg"
            className="w-full h-11 text-sm font-semibold"
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
            <div className="flex items-center justify-between gap-3 px-3 py-2 border border-destructive/30 bg-destructive/5 text-destructive text-sm">
              <span>{error}</span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="shrink-0 font-medium underline underline-offset-2 hover:opacity-80 disabled:opacity-50 transition-opacity"
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
