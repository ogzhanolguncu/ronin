import * as React from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.ComponentProps<"input">, "type"> & {
  label: string;
  hint?: string;
};

function Checkbox({ label, hint, className, id, ...props }: CheckboxProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className={cn(
          "group flex cursor-pointer items-center gap-1.5",
          className,
        )}
      >
        <span className="relative flex size-[15px] shrink-0 items-center justify-center">
          <input
            type="checkbox"
            id={inputId}
            className="peer border-border-soft checked:border-primary/60 checked:bg-primary/8 focus-visible:outline-ring/50 size-full cursor-pointer appearance-none rounded-[3px] border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
            {...props}
          />
          <svg
            className="text-primary/80 pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
            viewBox="0 0 15 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 7.5 6.5 10 11 5" />
          </svg>
        </span>
        <span className="text-foreground/80 text-sm">{label}</span>
      </label>
      {hint && <p className="text-muted2/60 text-[13px]">{hint}</p>}
    </div>
  );
}

export { Checkbox };
export type { CheckboxProps };
