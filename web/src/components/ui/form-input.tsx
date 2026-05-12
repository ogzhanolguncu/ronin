import * as React from "react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "@/components/ui/input";
import { inputVariants } from "@/components/ui/input-variants";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

type FormInputProps = InputProps & {
  label?: string;
  error?: string;
  variant?: InputProps["variant"];
  required?: boolean;
  hint?: string;
  maxLength?: number;
  currentLength?: number;
};

function FormInput({
  label,
  error,
  id,
  variant,
  required,
  hint,
  maxLength,
  currentLength,
  ...props
}: FormInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const showCounter =
    maxLength != null && currentLength != null && currentLength > 0;
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={inputId}
          className="text-foreground/80 text-sm font-medium"
        >
          {label}
          {required && (
            <span className="text-shu/70 ml-1 text-[11px] font-normal">*</span>
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
          <div className="min-w-0 flex-1">
            {error && (
              <p
                id={`${inputId}-error`}
                className="text-destructive/80 border-destructive/30 animate-in fade-in border-l-2 pl-2 text-xs duration-200"
              >
                {error}
              </p>
            )}
            {!error && hint && (
              <p className="text-muted2/60 text-[13px]">{hint}</p>
            )}
          </div>
          {showCounter && (
            <span className="text-muted2/50 shrink-0 text-[13px] tabular-nums">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

type FormTextareaProps = React.ComponentProps<"textarea"> & {
  label?: string;
  error?: string;
  variant?: InputProps["variant"];
  required?: boolean;
  hint?: string;
  maxLength?: number;
  currentLength?: number;
};

function FormTextarea({
  label,
  error,
  id,
  className,
  variant,
  required,
  hint,
  maxLength,
  currentLength,
  ...props
}: FormTextareaProps) {
  const generatedId = React.useId();
  const textareaId = id ?? generatedId;
  const showCounter =
    maxLength != null && currentLength != null && currentLength > 0;
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-foreground/80 text-sm font-medium"
        >
          {label}
          {required && (
            <span className="text-shu/70 ml-1 text-[11px] font-normal">*</span>
          )}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        className={cn(
          inputVariants({ variant: variant ?? "default" }),
          "field-sizing-content h-auto min-h-[5lh] py-1.5",
          className,
        )}
        {...props}
      />
      {(error || hint || showCounter) && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {error && (
              <p
                id={`${textareaId}-error`}
                className="text-destructive/80 border-destructive/30 animate-in fade-in border-l-2 pl-2 text-xs duration-200"
              >
                {error}
              </p>
            )}
            {!error && hint && (
              <p className="text-muted2/60 text-[13px]">{hint}</p>
            )}
          </div>
          {showCounter && (
            <span className="text-muted2/50 shrink-0 text-[13px] tabular-nums">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

type FormSelectOption = { value: string; label: string };

type FormSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  options: FormSelectOption[];
  placeholder?: string;
};

function FormSelect({
  label,
  error,
  id,
  required,
  hint,
  options,
  placeholder,
  className,
  value,
  ...props
}: FormSelectProps) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  const isPlaceholder = !value;
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={selectId}
          className="text-foreground/80 text-sm font-medium"
        >
          {label}
          {required && (
            <span className="text-shu/70 ml-1 text-[11px] font-normal">*</span>
          )}
        </label>
      )}
      <NativeSelect
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={cn(
          "w-full font-mono",
          isPlaceholder && "text-muted-foreground",
          className,
        )}
        value={value}
        {...props}
      >
        <NativeSelectOption value="" disabled={required}>
          {placeholder ?? "None"}
        </NativeSelectOption>
        {options.map((opt) => (
          <NativeSelectOption key={opt.value} value={opt.value}>
            {opt.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {(error || hint) && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {error && (
              <p
                id={`${selectId}-error`}
                className="text-destructive/80 border-destructive/30 animate-in fade-in border-l-2 pl-2 text-xs duration-200"
              >
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

export { FormInput, FormTextarea, FormSelect };
export type { FormInputProps, FormTextareaProps, FormSelectProps };
