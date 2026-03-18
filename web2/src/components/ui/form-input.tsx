import * as React from "react"
import { cn } from "@/lib/utils"
import { Input, inputVariants, type InputProps } from "@/components/ui/input"

type FormInputProps = InputProps & {
  label?: string
  error?: string
  variant?: InputProps["variant"]
  required?: boolean
  hint?: string
  maxLength?: number
  currentLength?: number
}

function FormInput({ label, error, id, variant, required, hint, maxLength, currentLength, ...props }: FormInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const showCounter = maxLength != null && currentLength != null && currentLength > 0
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground/80">
          {label}
          {required && (
            <span className="ml-1 text-[11px] text-shu/70 font-normal">*</span>
          )}
        </label>
      )}
      <Input
        id={inputId}
        variant={variant}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {(error || hint || showCounter) && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {error && (
              <p
                id={`${inputId}-error`}
                className="text-xs text-destructive/80 border-l-2 border-destructive/30 pl-2 animate-in fade-in duration-200"
              >
                {error}
              </p>
            )}
            {!error && hint && (
              <p className="text-[13px] text-muted2/60">{hint}</p>
            )}
          </div>
          {showCounter && (
            <span className="text-[13px] text-muted2/50 tabular-nums shrink-0">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

type FormTextareaProps = React.ComponentProps<"textarea"> & {
  label?: string
  error?: string
  variant?: InputProps["variant"]
  required?: boolean
  hint?: string
  maxLength?: number
  currentLength?: number
}

function FormTextarea({ label, error, id, className, variant, required, hint, maxLength, currentLength, ...props }: FormTextareaProps) {
  const generatedId = React.useId()
  const textareaId = id ?? generatedId
  const showCounter = maxLength != null && currentLength != null && currentLength > 0
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-foreground/80">
          {label}
          {required && (
            <span className="ml-1 text-[11px] text-shu/70 font-normal">*</span>
          )}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        className={cn(
          inputVariants({ variant: variant ?? "default" }),
          "h-auto field-sizing-content min-h-[5lh] py-1.5",
          className
        )}
        {...props}
      />
      {(error || hint || showCounter) && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {error && (
              <p
                id={`${textareaId}-error`}
                className="text-xs text-destructive/80 border-l-2 border-destructive/30 pl-2 animate-in fade-in duration-200"
              >
                {error}
              </p>
            )}
            {!error && hint && (
              <p className="text-[13px] text-muted2/60">{hint}</p>
            )}
          </div>
          {showCounter && (
            <span className="text-[13px] text-muted2/50 tabular-nums shrink-0">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export { FormInput, FormTextarea }
export type { FormInputProps, FormTextareaProps }
