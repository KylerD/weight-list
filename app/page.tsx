'use client';

import { useState } from 'react';
import { StepIndicator } from '@/app/_components/step-indicator';
import { Describe } from '@/app/_components/describe';
import { Configure } from '@/app/_components/configure';
import { UploadMap } from '@/app/_components/upload-map';
import { Results } from '@/app/_components/results';
import type { Rubric } from '@/models/rubric.schema';
import type { ColumnMapping } from '@/models/mapping.schema';

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[] | null>(null);
  const [identifierColumn, setIdentifierColumn] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);

  function handleReset() {
    setStep(1);
    setRubric(null);
    setMappings(null);
    setIdentifierColumn(null);
    setRows(null);
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* App header */}
      <header className="flex items-center justify-center px-6 pt-8 pb-2">
        <h1 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
          Weight-List
        </h1>
      </header>

      <StepIndicator currentStep={step} />

      <main className="flex flex-col items-center flex-1 py-6 px-4">
        <div className="w-full max-w-4xl">
          {step === 1 && (
            <Describe
              onComplete={(generatedRubric) => {
                setRubric(generatedRubric);
                setStep(2);
              }}
            />
          )}

          {step === 2 && rubric && (
            <Configure
              initialRubric={rubric}
              onComplete={(confirmedRubric) => {
                setRubric(confirmedRubric);
                setStep(3);
              }}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && rubric && (
            <UploadMap
              rubric={rubric}
              onComplete={(confirmedMappings, confirmedIdentifierColumn, parsedRows) => {
                setMappings(confirmedMappings);
                setIdentifierColumn(confirmedIdentifierColumn);
                setRows(parsedRows);
                setStep(4);
              }}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && rubric && mappings && identifierColumn && rows && (
            <Results
              rubric={rubric}
              mappings={mappings}
              identifierColumn={identifierColumn}
              rows={rows}
              onReset={handleReset}
            />
          )}
        </div>
      </main>
    </div>
  );
}
