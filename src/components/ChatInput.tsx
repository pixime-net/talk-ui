import { type FormEvent, useState } from "react";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={disabled}
        placeholder="Envoyer un message…"
        aria-label="Message"
        className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-foreground placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        aria-label="Envoyer"
        className="rounded-lg bg-accent px-4 py-2 font-medium text-background transition-opacity disabled:opacity-50"
      >
        Envoyer
      </button>
    </form>
  );
}
