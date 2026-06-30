import { useState } from "react";

interface ToolCallItemProps {
  toolName: string;
  toolArgs?: string;
  toolResult?: string;
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

  if (isInProgress) {
    return (
      <div className="rounded-lg bg-white/5 px-3 py-2">
        <div className="flex items-center gap-2" data-testid="tool-call-header">
          <span className="text-sm">🔧</span>
          <span className="font-mono text-sm text-white/80">{toolName}</span>
          <span
            className="ml-auto h-2 w-2 rounded-full bg-white/60 animate-pulse"
            data-testid="tool-call-in-progress"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <button
        type="button"
        className="flex w-full items-center gap-2 cursor-pointer"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-sm">🔧</span>
        <span className="font-mono text-sm text-white/80">{toolName}</span>
        <span
          className={`ml-auto text-white/40 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        >
          ▸
        </span>
      </button>
      {expanded && (
        <div className="mt-2 pl-4 text-xs text-white/60 font-mono whitespace-pre-wrap">
          {toolArgs && (
            <div>
              <div className="text-white/40 text-xs uppercase tracking-wider mb-1">
                Arguments
              </div>
              <pre data-testid="tool-call-args">{formatJson(toolArgs)}</pre>
            </div>
          )}
          {hasNonEmptyResult && (
            <div className="mt-2">
              <div className="text-white/40 text-xs uppercase tracking-wider mb-1">
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
