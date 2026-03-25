'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Rubric } from '@/models/rubric.schema';
import type { ColumnMapping } from '@/models/mapping.schema';
import type { ScoredLead } from '@/models/scoring.schema';
import { scoreLeadsAction } from '@/actions/scoring.action';

interface ResultsProps {
  rubric: Rubric;
  mappings: ColumnMapping[];
  identifierColumn: string;
  rows: Record<string, string>[];
  onReset: () => void;
}

type TierName = 'Strong' | 'Possible' | 'Weak';

const TIER_CONFIG: Record<
  TierName,
  { label: string; accent: string; headerBg: string; border: string; badge: string; scoreColor: string }
> = {
  Strong: {
    label: 'Strong',
    accent: 'text-green-700 dark:text-green-400',
    headerBg: 'bg-green-500/10 border-green-500/30',
    border: 'border-green-500/20',
    badge: 'bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30',
    scoreColor: 'text-green-700 dark:text-green-400',
  },
  Possible: {
    label: 'Possible',
    accent: 'text-amber-700 dark:text-amber-400',
    headerBg: 'bg-amber-500/10 border-amber-500/30',
    border: 'border-amber-500/20',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
    scoreColor: 'text-amber-700 dark:text-amber-400',
  },
  Weak: {
    label: 'Weak',
    accent: 'text-muted-foreground',
    headerBg: 'bg-muted/40 border-border',
    border: 'border-border',
    badge: 'bg-muted text-muted-foreground border border-border',
    scoreColor: 'text-muted-foreground',
  },
};

function Spinner() {
  return (
    <svg
      className="size-5 animate-spin text-muted-foreground"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

interface LeadCardProps {
  lead: ScoredLead;
  config: (typeof TIER_CONFIG)[TierName];
}

function LeadCard({ lead, config }: LeadCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn('border-b last:border-b-0', config.border)}>
      {/* Lead header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-4 px-4 py-3',
          'hover:bg-muted/30 transition-colors text-left'
        )}
        aria-expanded={expanded}
      >
        <span className="text-sm font-medium truncate flex-1">{lead.identifier}</span>
        <div className="flex items-center gap-3 shrink-0">
          <span className={cn('text-2xl font-bold tabular-nums leading-none', config.scoreColor)}>
            {Math.round(lead.overallScore)}
          </span>
          <ChevronIcon expanded={expanded} />
        </div>
      </button>

      {/* Expandable breakdown */}
      {expanded && (
        <div className="px-4 pb-4 pt-1">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 pr-3 font-semibold uppercase tracking-wide text-muted-foreground">
                  Criterion
                </th>
                <th className="text-right py-1.5 px-3 font-semibold uppercase tracking-wide text-muted-foreground">
                  Weight
                </th>
                <th className="text-right py-1.5 px-3 font-semibold uppercase tracking-wide text-muted-foreground">
                  Score
                </th>
                <th className="text-right py-1.5 pl-3 font-semibold uppercase tracking-wide text-muted-foreground">
                  Contribution
                </th>
              </tr>
            </thead>
            <tbody>
              {lead.criterionScores.map((cs) => (
                <tr key={cs.criterionId} className="border-b border-border/50 last:border-b-0">
                  <td className="py-1.5 pr-3 text-foreground">{cs.criterionLabel}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-muted-foreground">
                    {cs.weight}%
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{cs.score}</td>
                  <td className="py-1.5 pl-3 text-right tabular-nums font-medium">
                    {cs.weightedContribution.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-4 text-muted-foreground transition-transform duration-150', expanded && 'rotate-180')}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

interface TierGroupProps {
  tier: TierName;
  leads: ScoredLead[];
}

function TierGroup({ tier, leads }: TierGroupProps) {
  const [open, setOpen] = useState(true);
  const config = TIER_CONFIG[tier];

  return (
    <div className={cn('border', config.border)}>
      {/* Tier header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 border-b transition-colors',
          config.headerBg,
          open ? 'border-b-inherit' : 'border-b-transparent'
        )}
        aria-expanded={open}
      >
        <span className={cn('text-sm font-bold uppercase tracking-widest', config.accent)}>
          {config.label}
        </span>
        <span className={cn('text-xs font-semibold px-2 py-0.5', config.badge)}>
          {leads.length}
        </span>
        <span className="ml-auto">
          <ChevronIcon expanded={open} />
        </span>
      </button>

      {/* Leads list */}
      {open && (
        <div>
          {leads.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">No leads in this tier.</p>
          ) : (
            leads.map((lead) => (
              <LeadCard key={lead.identifier} lead={lead} config={config} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function Results({
  rubric,
  mappings,
  identifierColumn,
  rows,
  onReset,
}: ResultsProps) {
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [leads, setLeads] = useState<ScoredLead[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function runScoring() {
    setStatus('loading');
    setErrorMsg(null);

    const result = await scoreLeadsAction(rubric.criteria, mappings, identifierColumn, rows);

    if (result.error || !result.data) {
      setErrorMsg(result.error ?? 'Unknown error');
      setStatus('error');
    } else {
      setLeads(result.data.leads);
      setStatus('done');
    }
  }

  useEffect(() => {
    runScoring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const strong = leads.filter((l) => l.tier === 'Strong');
  const possible = leads.filter((l) => l.tier === 'Possible');
  const weak = leads.filter((l) => l.tier === 'Weak');

  return (
    <div className="flex flex-col gap-8 px-6 py-10 max-w-3xl mx-auto w-full">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scoring Results</h1>
          {status === 'done' && (
            <p className="mt-2 text-sm text-muted-foreground">
              {leads.length} lead{leads.length !== 1 ? 's' : ''} scored across{' '}
              {rubric.criteria.length} criteria.
            </p>
          )}
        </div>
        <Button variant="outline" onClick={onReset} className="shrink-0">
          Start Over
        </Button>
      </div>

      {/* Loading state */}
      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 border border-border">
          <Spinner />
          <p className="text-sm text-muted-foreground font-medium">
            Scoring {rows.length} lead{rows.length !== 1 ? 's' : ''}…
          </p>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="flex flex-col items-center gap-4 py-12 border border-destructive/40 bg-destructive/5 px-6">
          <p className="text-sm text-destructive font-semibold text-center">
            {errorMsg ?? 'Something went wrong.'}
          </p>
          <Button variant="destructive" onClick={runScoring}>
            Retry
          </Button>
        </div>
      )}

      {/* Results */}
      {status === 'done' && (
        <div className="flex flex-col gap-4">
          <TierGroup tier="Strong" leads={strong} />
          <TierGroup tier="Possible" leads={possible} />
          <TierGroup tier="Weak" leads={weak} />
        </div>
      )}

      {/* Bottom start over */}
      {status === 'done' && (
        <div className="pt-2">
          <Button variant="outline" onClick={onReset} className="w-full">
            Start Over
          </Button>
        </div>
      )}
    </div>
  );
}
