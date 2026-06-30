interface ErrorBlockProps {
  message: string;
}

export function ErrorBlock({ message }: ErrorBlockProps) {
  return (
    <div className="flex justify-start">
      <div
        role="alert"
        aria-live="polite"
        className="max-w-[75%] rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-400"
      >
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}
