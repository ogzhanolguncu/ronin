import * as React from "react";
import { cn } from "@/lib/utils";
import { inputVariants, type InputProps } from "@/components/ui/input";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  onBlur?: () => void;
  placeholder?: string;
  variant?: InputProps["variant"];
  className?: string;
  label?: string;
  error?: string;
  hint?: React.ReactNode;
  id?: string;
  name?: string;
  allTags?: string[];
};

function commitTag(input: string, existing: string[]): string | null {
  const tag = input.trim().replace(/^#/, "");
  if (!tag) return null;
  if (existing.some((t) => t.toLowerCase() === tag.toLowerCase())) return null;
  return tag;
}

function filterTags(
  query: string,
  selected: string[],
  allTags: string[],
): string[] {
  if (!query) return [];
  const prefix = query.toLowerCase();
  return allTags
    .filter(
      (t) =>
        t.toLowerCase().startsWith(prefix) &&
        !selected.some((s) => s.toLowerCase() === t.toLowerCase()),
    )
    .slice(0, 10);
}

function TagInput({
  value,
  onChange,
  onBlur,
  placeholder,
  variant = "default",
  className,
  id,
  name,
  allTags = [],
}: TagInputProps) {
  const [input, setInput] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function addTags(raw: string) {
    const parts = raw.split(",");
    let next = [...value];
    for (const part of parts) {
      const tag = commitTag(part, next);
      if (tag) next = [...next, tag];
    }
    if (next.length !== value.length) onChange(next);
  }

  function pickSuggestion(tag: string) {
    onChange([...value, tag]);
    setInput("");
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showDropdown && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        pickSuggestion(suggestions[highlightedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowDropdown(false);
        return;
      }
    }
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTags(input);
      setInput("");
      setShowDropdown(false);
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    addTags(text);
    setInput("");
    setShowDropdown(false);
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInput(val);
    const query = val.trim().replace(/^#/, "");
    const filtered = filterTags(query, value, allTags);
    setSuggestions(filtered);
    setHighlightedIndex(-1);
    setShowDropdown(filtered.length > 0);
  }

  return (
    <div
      className={cn(
        inputVariants({ variant }),
        "focus-within:border-ring relative flex cursor-text flex-wrap items-center gap-1.5",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <span
          key={tag}
          className="text-primary bg-accent-dim inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-xs"
        >
          #{tag}
          <button
            type="button"
            className="text-muted2/50 hover:text-muted2 leading-none transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(i);
            }}
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        className="placeholder:text-muted-foreground min-w-[60px] flex-1 bg-transparent font-mono text-sm outline-none"
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          setTimeout(() => {
            if (input.trim()) {
              addTags(input);
              setInput("");
            }
            setShowDropdown(false);
            onBlur?.();
          }, 150);
        }}
        placeholder={value.length === 0 ? placeholder : undefined}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="border-border-soft bg-background absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-sm border shadow-sm">
          {suggestions.map((tag, i) => (
            <button
              key={tag}
              type="button"
              className={cn(
                "w-full px-2.5 py-1.5 text-left font-mono text-xs transition-colors",
                i === highlightedIndex
                  ? "bg-surface2 text-primary"
                  : "text-foreground hover:bg-surface2",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                pickSuggestion(tag);
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type FormTagInputProps = TagInputProps;

function FormTagInput({ label, error, hint, id, ...props }: FormTagInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={inputId}
          className="text-foreground/80 font-sans text-sm font-medium"
        >
          {label}
        </label>
      )}
      <TagInput id={inputId} {...props} />
      {(error || hint) && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {error && (
              <p className="text-destructive/80 border-destructive/30 animate-in fade-in border-l-2 pl-2 text-xs duration-200">
                {error}
              </p>
            )}
            {!error && hint && (
              <p className="text-muted2/60 text-[13px]">{hint}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { TagInput, FormTagInput };
export type { TagInputProps, FormTagInputProps };
