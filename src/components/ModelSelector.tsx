import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MODEL_ALIASES, type ModelAlias } from "../config/models";

interface ModelSelectorProps {
  value: ModelAlias;
  onChange: (model: ModelAlias) => void;
  disabled?: boolean;
}

export function ModelSelector({
  value,
  onChange,
  disabled = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 200);
      setFocusedIndex(MODEL_ALIASES.indexOf(value));
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (open) {
      listRef.current?.focus();
    }
  }, [open]);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, MODEL_ALIASES.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIndex >= 0) {
          const model = MODEL_ALIASES[focusedIndex];
          if (model !== undefined) onChange(model);
          setOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        aria-label="Modèle"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-white/30 hover:text-foreground disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3 text-white/70"
          aria-hidden="true"
        >
          <path d="M6.5 2.75A1.75 1.75 0 0 0 4.75 4.5v.25h-.25A1.75 1.75 0 0 0 2.75 6.5v7A1.75 1.75 0 0 0 4.5 15.25h.25v.25A1.75 1.75 0 0 0 6.5 17.25h7a1.75 1.75 0 0 0 1.75-1.75v-.25h.25a1.75 1.75 0 0 0 1.75-1.75v-7a1.75 1.75 0 0 0-1.75-1.75h-.25V4.5A1.75 1.75 0 0 0 13.5 2.75h-7ZM6.25 4.5a.25.25 0 0 1 .25-.25h7a.25.25 0 0 1 .25.25v11a.25.25 0 0 1-.25.25h-7a.25.25 0 0 1-.25-.25v-11ZM4.5 6.25h.25v7.5H4.5a.25.25 0 0 1-.25-.25v-7a.25.25 0 0 1 .25-.25Zm11 0h.25a.25.25 0 0 1 .25.25v7a.25.25 0 0 1-.25.25h-.25v-7.5Z" />
        </svg>
        {value}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Modèle"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className={`absolute right-0 z-50 max-h-48 w-max overflow-y-auto rounded-lg border border-white/15 bg-neutral-900 py-1 shadow-lg outline-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/30 ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {MODEL_ALIASES.map((alias, index) => (
            <li
              key={alias}
              role="option"
              aria-selected={alias === value}
              onClick={() => {
                onChange(alias);
                setOpen(false);
              }}
              className={`cursor-pointer whitespace-nowrap px-3 py-1 text-xs transition-colors ${
                alias === value
                  ? "bg-accent/20 text-accent"
                  : "text-muted hover:bg-white/10 hover:text-foreground"
              } ${index === focusedIndex ? "bg-white/10 text-foreground" : ""}`}
            >
              {alias}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
