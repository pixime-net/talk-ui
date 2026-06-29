import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { THINKING_EFFORTS, type ThinkingEffort } from "../config/models";

interface ThinkingEffortSelectorProps {
  value: ThinkingEffort;
  onChange: (effort: ThinkingEffort) => void;
  disabled?: boolean;
}

export function ThinkingEffortSelector({
  value,
  onChange,
  disabled = false,
}: ThinkingEffortSelectorProps) {
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
      setFocusedIndex(THINKING_EFFORTS.indexOf(value));
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
        setFocusedIndex((i) => Math.min(i + 1, THINKING_EFFORTS.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIndex >= 0) {
          onChange(THINKING_EFFORTS[focusedIndex]);
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
        aria-label="Effort de réflexion"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-white/30 hover:text-foreground disabled:opacity-50"
      >
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
          aria-label="Effort de réflexion"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className={`absolute right-0 z-50 max-h-48 w-max overflow-y-auto rounded-lg border border-white/15 bg-neutral-900 py-1 shadow-lg outline-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/30 ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {THINKING_EFFORTS.map((effort, index) => (
            <li
              key={effort}
              role="option"
              aria-selected={effort === value}
              onClick={() => {
                onChange(effort);
                setOpen(false);
              }}
              className={`cursor-pointer whitespace-nowrap px-3 py-1 text-xs transition-colors ${
                effort === value
                  ? "bg-accent/20 text-accent"
                  : "text-muted hover:bg-white/10 hover:text-foreground"
              } ${index === focusedIndex ? "bg-white/10 text-foreground" : ""}`}
            >
              {effort}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
