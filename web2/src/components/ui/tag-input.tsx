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
  variant = "ghost",
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
        "flex flex-wrap items-center gap-1.5 cursor-text",
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
        className="min-w-[60px] flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted2/30"
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

function FormTagInput({ label, error, id, ...props }: FormTagInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  return (
    <div className="flex flex-col gap-2.5">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-foreground/70 font-sans">
          {label}
        </label>
      )}
      <TagInput id={inputId} {...props} />
      {error && (
        <p className="text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export { TagInput, FormTagInput }
export type { TagInputProps, FormTagInputProps }
