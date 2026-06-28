export function ActivityIndicator() {
  return (
    <div className="flex justify-start" aria-label="L'assistant réfléchit">
      <div className="flex gap-1 rounded-lg bg-white/5 px-4 py-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted [animation-delay:300ms]" />
      </div>
    </div>
  );
}
