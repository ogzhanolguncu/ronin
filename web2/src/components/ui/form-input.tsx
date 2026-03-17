import * as React from "react"
import { cn } from "@/lib/utils"
import { Input, inputVariants, type InputProps } from "@/components/ui/input"

type FormInputProps = InputProps & {
  label?: string
  error?: string
  variant?: InputProps["variant"]
}

function FormInput({ label, error, id, variant, ...props }: FormInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  return (
    <div className="flex flex-col gap-2.5">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-foreground/80">
          {label}
        </label>
      )}
      <Input
        id={inputId}
        variant={variant}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

type FormTextareaProps = React.ComponentProps<"textarea"> & {
  label?: string
  error?: string
  variant?: InputProps["variant"]
}

function FormTextarea({ label, error, id, className, variant, ...props }: FormTextareaProps) {
  const generatedId = React.useId()
  const textareaId = id ?? generatedId
  return (
    <div className="flex flex-col gap-2.5">
      {label && (
        <label htmlFor={textareaId} className="text-[13px] font-medium text-foreground/80">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        className={cn(
          inputVariants({ variant: variant ?? "default" }),
          "field-sizing-content min-h-[1lh] resize-none py-1.5",
          className
        )}
        {...props}
      />
      {error && (
        <p id={`${textareaId}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export { FormInput, FormTextarea }
export type { FormInputProps, FormTextareaProps }
