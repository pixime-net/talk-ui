interface InterruptBlockProps {
  onContinue: () => void;
  disabled: boolean;
}

export function InterruptBlock({ onContinue, disabled }: InterruptBlockProps) {
  return (
    <div className="flex justify-start">
      <div
        role="status"
        aria-live="polite"
        className="flex max-w-[75%] flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-300"
      >
        <p className="text-sm">The assistant reached its tool call limit.</p>
        <button
          type="button"
          onClick={() => {
            onContinue();
          }}
          disabled={disabled}
          className="self-start rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 transition-colors hover:border-amber-400/60 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
