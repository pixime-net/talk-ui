import { useState } from "react";

interface ToolCallItemProps {
  toolName: string;
  toolArgs?: string | undefined;
  toolResult?: string | undefined;
}

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function ToolCallItem({
  toolName,
  toolArgs,
  toolResult,
}: ToolCallItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isInProgress = toolResult === undefined || toolResult === null;
  const hasNonEmptyResult =
    toolResult !== undefined && toolResult !== null && toolResult.trim() !== "";

  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-1.5">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 cursor-pointer"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        data-testid="tool-call-header"
      >
        <span className="text-xs">🔧</span>
        <span className="font-mono text-xs text-white/80">{toolName}</span>
        {isInProgress && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse"
            data-testid="tool-call-in-progress"
          />
        )}
        <span className="ml-auto text-white/40" aria-hidden="true">
          {expanded ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M14.78 12.53a.75.75 0 0 1-1.06 0L10 8.81l-3.72 3.72a.75.75 0 1 1-1.06-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06Z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 0 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      </button>
      {expanded && (
        <div className="mt-1.5 pl-3 text-[11px] leading-4 text-white/60 font-mono whitespace-pre-wrap">
          {toolArgs && (
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-wider text-white/40">
                Arguments
              </div>
              <pre data-testid="tool-call-args">{formatJson(toolArgs)}</pre>
            </div>
          )}
          {isInProgress && (
            <div className="mt-1.5 text-[10px] uppercase tracking-wider text-white/40">
              Running...
            </div>
          )}
          {hasNonEmptyResult && (
            <div className="mt-1.5">
              <div className="mb-0.5 text-[10px] uppercase tracking-wider text-white/40">
                Result
              </div>
              <pre data-testid="tool-call-result">{formatJson(toolResult)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
