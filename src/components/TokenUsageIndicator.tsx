import { useEffect, useId, useRef, useState } from "react";
import {
  CONTEXT_STATUS_LABELS,
  contextUsageView,
  formatPercent,
  formatTokenCount,
  type ContextStatus,
  type CumulativeUsage,
  type TokenUsage,
} from "../config/token-usage-schemas";

interface TokenUsageIndicatorProps {
  lastCallUsage: TokenUsage | null;
  cumulativeUsage: CumulativeUsage | null;
}

const STATUS_CLASSES: Record<ContextStatus, string> = {
  normal: "border-white/15 text-muted",
  warning: "border-amber-400/40 text-amber-300",
  critical: "border-orange-500/50 text-orange-300",
  blocked: "border-red-500/60 text-red-300",
};

const DETAIL_FIELDS = [
  ["input_tokens", "Input"],
  ["output_tokens", "Output"],
  ["cache_read_tokens", "Cache read"],
  ["cache_write_tokens", "Cache write"],
  ["reasoning_tokens", "Reasoning"],
  ["context_window_tokens", "Context limit"],
  ["provider_max_output_tokens", "Provider output limit"],
] as const satisfies readonly (readonly [keyof TokenUsage, string])[];

const DETAIL_RATIO_FIELDS = [
  ["context_ratio", "Context ratio"],
  ["output_ratio", "Output ratio"],
] as const satisfies readonly (readonly [keyof TokenUsage, string])[];

interface DetailRow {
  key: string;
  label: string;
  value: string;
}

function detailRows(usage: TokenUsage | null, prefix: string): DetailRow[] {
  if (usage === null) return [];
  const rows: DetailRow[] = [];
  for (const [field, label] of DETAIL_FIELDS) {
    const value = usage[field];
    if (typeof value !== "number") continue;
    rows.push({
      key: `${prefix}-${field}`,
      label,
      value: formatTokenCount(value),
    });
  }
  for (const [field, label] of DETAIL_RATIO_FIELDS) {
    const value = usage[field];
    if (typeof value !== "number") continue;
    rows.push({
      key: `${prefix}-${field}`,
      label,
      value: formatPercent(value),
    });
  }
  return rows;
}

export function TokenUsageIndicator({
  lastCallUsage,
  cumulativeUsage,
}: Readonly<TokenUsageIndicatorProps>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const detailsId = useId();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const context = contextUsageView(lastCallUsage);
  const lastCallRows = detailRows(lastCallUsage, "last");
  const cumulativeRows = detailRows(cumulativeUsage, "total");

  if (
    context === null &&
    lastCallRows.length === 0 &&
    cumulativeRows.length === 0
  ) {
    return null;
  }

  const status = context?.status;
  const statusLabel = status ? CONTEXT_STATUS_LABELS[status] : undefined;
  const inputText =
    context === null ? "" : formatTokenCount(context.inputTokens);

  let accessibleContextText = "Last completed call: context usage unavailable";
  if (context !== null) {
    if (context.ratio === undefined || context.limitTokens === undefined) {
      accessibleContextText = `Last completed call context: ${inputText} input tokens, context limit unavailable`;
    } else {
      accessibleContextText = `Last completed call context: ${inputText} of ${formatTokenCount(
        context.limitTokens,
      )} tokens, ${formatPercent(context.ratio)}, ${statusLabel ?? ""}`;
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-flex flex-wrap items-center gap-1"
      data-testid="token-usage-indicator"
    >
      {context !== null && (
        <span
          data-testid="context-usage"
          data-status={status ?? "limit-unavailable"}
          className={`flex items-center gap-1 rounded-md border bg-white/5 px-2 py-0.5 text-[11px] ${
            status ? STATUS_CLASSES[status] : "border-white/15 text-muted"
          }`}
          {...(context.ratio !== undefined
            ? {
                role: "progressbar",
                "aria-valuemin": 0,
                "aria-valuemax": 100,
                "aria-valuenow": Math.min(100, Math.round(context.ratio * 100)),
              }
            : {})}
          aria-label={accessibleContextText}
        >
          <span aria-hidden="true">ctx</span>
          <span aria-hidden="true">{inputText}</span>
          {context.ratio !== undefined ? (
            <span aria-hidden="true">· {formatPercent(context.ratio)}</span>
          ) : (
            <span aria-hidden="true">· limit n/a</span>
          )}
        </span>
      )}

      <button
        type="button"
        aria-label="Token usage details"
        aria-expanded={open}
        aria-controls={detailsId}
        aria-haspopup="dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            setOpen(false);
            event.currentTarget.focus();
          }
        }}
        onClick={() => {
          setOpen(!open);
        }}
        className="flex items-center rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-white/30 hover:text-foreground"
      >
        <span aria-hidden="true">ⓘ</span>
      </button>

      {open && (
        <dialog
          id={detailsId}
          data-testid="token-usage-details"
          open
          aria-label="Token usage details"
          className="absolute bottom-full right-0 z-50 mb-1 max-h-60 w-max max-w-[min(18rem,80vw)] overflow-y-auto rounded-lg border border-white/15 bg-neutral-900 p-3 text-[11px] shadow-lg"
        >
          <p className="pb-1 font-medium text-foreground">
            Last completed call
          </p>
          {lastCallRows.length === 0 ? (
            <p className="text-muted">No confirmed values</p>
          ) : (
            <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
              {lastCallRows.map((row) => (
                <div key={row.key} className="contents">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="text-right text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {cumulativeRows.length > 0 && (
            <>
              <p className="pb-1 pt-2 font-medium text-foreground">
                Session total
              </p>
              <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
                {cumulativeRows.map((row) => (
                  <div key={row.key} className="contents">
                    <dt className="text-muted">{row.label}</dt>
                    <dd className="text-right text-foreground">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </dialog>
      )}
    </div>
  );
}
