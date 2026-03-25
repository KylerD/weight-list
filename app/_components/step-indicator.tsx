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
    <nav
      aria-label="Progress"
      className="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto py-8 border-b border-border"
    >
      <ol className="flex items-center gap-0 list-none p-0 m-0">
        {STEPS.map((step, i) => {
          const isCompleted = currentStep > step.number;
          const isActive = currentStep === step.number;
          return (
            <li key={step.number} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
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
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider whitespace-nowrap",
                    isActive && "text-primary",
                    isCompleted && "text-foreground",
                    !isActive && !isCompleted && "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "w-16 h-0.5 mx-3 mb-6",
                    currentStep > step.number ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
