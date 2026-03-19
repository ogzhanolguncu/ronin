import * as React from "react"
import { cn } from "@/lib/utils"
import { inputVariants, type InputProps } from "@/components/ui/input"

type TagInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  onBlur?: () => void
  placeholder?: string
  variant?: InputProps["variant"]
  className?: string
  label?: string
  error?: string
  hint?: React.ReactNode
  id?: string
  name?: string
}

function commitTag(input: string, existing: string[]): string | null {
  const tag = input.trim().replace(/^#/, "")
  if (!tag) return null
  if (existing.some((t) => t.toLowerCase() === tag.toLowerCase())) return null
  return tag
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
}: TagInputProps) {
  const [input, setInput] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  function addTags(raw: string) {
    const parts = raw.split(",")
    let next = [...value]
    for (const part of parts) {
      const tag = commitTag(part, next)
      if (tag) next = [...next, tag]
    }
    if (next.length !== value.length) onChange(next)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault()
      addTags(input)
      setInput("")
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData("text")
    addTags(text)
    setInput("")
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div
      className={cn(
        inputVariants({ variant }),
        "flex flex-wrap items-center gap-1.5 cursor-text focus-within:border-ring",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 font-mono text-xs text-primary px-1.5 py-0.5"
        >
          #{tag}
          <button
            type="button"
            className="text-muted2/50 hover:text-muted2 transition-colors leading-none"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(i)
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
        className="min-w-[60px] flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (input.trim()) {
            addTags(input)
            setInput("")
          }
          onBlur?.()
        }}
        placeholder={value.length === 0 ? placeholder : undefined}
      />
    </div>
  )
}

type FormTagInputProps = TagInputProps

function FormTagInput({ label, error, hint, id, ...props }: FormTagInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground/80 font-sans">
          {label}
        </label>
      )}
      <TagInput id={inputId} {...props} />
      {(error || hint) && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {error && (
              <p className="text-xs text-destructive/80 border-l-2 border-destructive/30 pl-2 animate-in fade-in duration-200">
                {error}
              </p>
            )}
            {!error && hint && (
              <p className="text-[13px] text-muted2/60">{hint}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { TagInput, FormTagInput }
export type { TagInputProps, FormTagInputProps }
