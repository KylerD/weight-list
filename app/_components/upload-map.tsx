'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { parseCSV } from '@/lib/csv/csv.parser';
import { mapColumnsAction } from '@/actions/mapping.action';
import type { Rubric } from '@/models/rubric.schema';
import type { ColumnMapping } from '@/models/mapping.schema';
import { cn } from '@/lib/utils';

interface UploadMapProps {
  rubric: Rubric;
  onComplete: (
    mappings: ColumnMapping[],
    identifierColumn: string,
    rows: Record<string, string>[]
  ) => void;
  onBack: () => void;
}

type Phase = 'upload' | 'mapping';

export function UploadMap({ rubric, onComplete, onBack }: UploadMapProps) {
  const [phase, setPhase] = useState<Phase>('upload');

  // Upload phase state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rowWarning, setRowWarning] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mapping phase state
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [identifierColumn, setIdentifierColumn] = useState<string>('');
  const [isMappingLoading, setIsMappingLoading] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        setUploadError('Only .csv files are accepted.');
        return;
      }

      setUploadError(null);
      setRowWarning(null);
      setIsParsingFile(true);

      try {
        const { headers, rows } = await parseCSV(file);

        if (rows.length > 200) {
          setRowWarning(
            `This file has ${rows.length} rows. Only the first 200 will be scored — large files may increase processing time.`
          );
        }

        setParsedHeaders(headers);
        setParsedRows(rows);

        // Auto-advance to mapping phase
        setPhase('mapping');
        setIsMappingLoading(true);
        setMappingError(null);

        const result = await mapColumnsAction(rubric.criteria, headers);

        if (result.error || !result.data) {
          setMappingError(result.error ?? 'Failed to map columns.');
          setMappings(
            rubric.criteria.map((c) => ({
              criterionId: c.id,
              criterionLabel: c.label,
              csvColumn: null,
              confidence: 'Low' as const,
            }))
          );
          setIdentifierColumn(headers[0] ?? '');
        } else {
          setMappings(result.data.mappings);
          setIdentifierColumn(result.data.identifierColumn);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to parse CSV.';
        setUploadError(message);
        setPhase('upload');
      } finally {
        setIsParsingFile(false);
        setIsMappingLoading(false);
      }
    },
    [rubric]
  );

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const handleMappingChange = (criterionId: string, newColumn: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.criterionId === criterionId
          ? { ...m, csvColumn: newColumn === '__none__' ? null : newColumn }
          : m
      )
    );
  };

  const handleConfirm = () => {
    onComplete(mappings, identifierColumn, parsedRows);
  };

  const handleBack = () => {
    if (phase === 'mapping') {
      setPhase('upload');
      setMappingError(null);
    } else {
      onBack();
    }
  };

  // --- Upload Phase ---
  if (phase === 'upload') {
    return (
      <div className="flex flex-col gap-8 px-6 py-10 max-w-2xl mx-auto w-full">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upload your data</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Upload a CSV file with the leads or items you want to score.
          </p>
        </div>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload CSV file"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-4 cursor-pointer select-none',
            'border-2 border-dashed px-8 py-16 transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          )}
        >
          {/* Upload icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-10 text-muted-foreground"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>

          <div className="text-center">
            <p className="text-sm font-semibold">
              {isDragging ? 'Drop your file here' : 'Drag & drop your CSV here'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              or <span className="underline underline-offset-2 text-foreground">click to browse</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">.csv files only</p>
          </div>

          {isParsingFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg
                className="animate-spin size-4 shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Parsing file…
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={handleFileInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* Row count warning */}
        {rowWarning && (
          <div className="flex items-start gap-3 px-3 py-2 border border-amber-400/40 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {rowWarning}
          </div>
        )}

        {/* Error state */}
        {uploadError && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 border border-destructive/30 bg-destructive/5 text-destructive text-sm">
            <span>{uploadError}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" onClick={handleBack} className="h-11 text-sm font-semibold">
            Back
          </Button>
        </div>
      </div>
    );
  }

  // --- Mapping Phase ---
  const columnOptions = ['__none__', ...parsedHeaders];

  return (
    <div className="flex flex-col gap-8 px-6 py-10 max-w-3xl mx-auto w-full">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Review column mapping</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          We mapped your CSV columns to each scoring criterion. Override any mapping as needed.
        </p>
      </div>

      {/* Mapping error banner */}
      {mappingError && (
        <div className="flex items-center gap-3 px-3 py-2 border border-destructive/30 bg-destructive/5 text-destructive text-sm">
          <span>{mappingError}</span>
        </div>
      )}

      {/* Identifier column selector */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold" htmlFor="identifier-column">
          Identifier column
        </label>
        <p className="text-xs text-muted-foreground">
          The column used to label each row in results (e.g. name, company, email).
        </p>
        {isMappingLoading ? (
          <div className="h-8 w-48 bg-muted animate-pulse" />
        ) : (
          <select
            id="identifier-column"
            value={identifierColumn}
            onChange={(e) => setIdentifierColumn(e.target.value)}
            className="h-8 max-w-xs border border-border bg-background px-2 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {parsedHeaders.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Mapping table */}
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">
                Criterion
              </th>
              <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">
                Mapped Column
              </th>
              <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">
                Confidence
              </th>
            </tr>
          </thead>
          <tbody>
            {isMappingLoading
              ? rubric.criteria.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="h-4 w-32 bg-muted animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-7 w-40 bg-muted animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-16 bg-muted animate-pulse" />
                    </td>
                  </tr>
                ))
              : mappings.map((mapping) => (
                  <tr key={mapping.criterionId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{mapping.criterionLabel}</td>
                    <td className="px-4 py-3">
                      <select
                        value={mapping.csvColumn ?? '__none__'}
                        onChange={(e) => handleMappingChange(mapping.criterionId, e.target.value)}
                        aria-label={`Mapped column for ${mapping.criterionLabel}`}
                        className="h-7 w-full max-w-[220px] border border-border bg-background px-2 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="__none__">— None —</option>
                        {parsedHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBadge confidence={mapping.confidence} />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={handleBack}
          disabled={isMappingLoading}
          className="h-11 text-sm font-semibold"
        >
          Back
        </Button>
        <Button
          size="lg"
          onClick={handleConfirm}
          disabled={isMappingLoading || !identifierColumn}
          className="h-11 text-sm font-semibold"
        >
          {isMappingLoading ? (
            <>
              <svg
                className="animate-spin size-4 shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Mapping columns…
            </>
          ) : (
            'Confirm Mapping'
          )}
        </Button>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: ColumnMapping['confidence'] }) {
  const styles: Record<ColumnMapping['confidence'], string> = {
    High: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    Low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-semibold',
        styles[confidence]
      )}
    >
      {confidence}
    </span>
  );
}
