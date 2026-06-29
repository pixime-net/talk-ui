import { type FormEvent, useState } from "react";
import { MODEL_ALIASES, type ModelAlias } from "../config/models";

interface ChatInputProps {
  onSend: (content: string) => void;
  selectedModel: ModelAlias;
  onModelChange: (model: ModelAlias) => void;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  selectedModel,
  onModelChange,
  disabled = false,
}: ChatInputProps) {
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
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value as ModelAlias)}
        disabled={disabled}
        aria-label="Modèle"
        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
      >
        {MODEL_ALIASES.map((alias) => (
          <option key={alias} value={alias}>
            {alias}
          </option>
        ))}
      </select>
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
