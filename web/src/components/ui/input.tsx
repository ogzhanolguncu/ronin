import * as React from "react";

import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { inputVariants } from "./input-variants";

type InputProps = React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants> & {
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
  };

function Input({
  className,
  variant,
  type,
  leftIcon,
  rightIcon,
  ...props
}: InputProps) {
  const isGhost = variant === "ghost";

  const iconClasses =
    "pointer-events-none absolute top-1/2 -translate-y-1/2 select-none [&>svg]:size-3.5";

  if (!leftIcon && !rightIcon) {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(inputVariants({ variant, className }))}
        {...props}
      />
    );
  }

  return (
    <div className="relative w-full" data-slot="input-wrapper">
      <input
        type={type}
        data-slot="input"
        className={cn(
          inputVariants({ variant }),
          "peer",
          leftIcon && (isGhost ? "pl-5" : "pl-8"),
          rightIcon && (isGhost ? "pr-5" : "pr-8"),
          className,
        )}
        {...props}
      />
      {leftIcon && (
        <span
          className={cn(
            iconClasses,
            isGhost
              ? "text-muted2/40 peer-[:not(:placeholder-shown)]:text-muted2 left-0 transition-colors duration-200"
              : "text-muted2 left-2.5",
          )}
          aria-hidden="true"
        >
          {leftIcon}
        </span>
      )}
      {rightIcon && (
        <span
          className={cn(
            iconClasses,
            isGhost
              ? "text-muted2/40 peer-[:not(:placeholder-shown)]:text-muted2 right-0 transition-colors duration-200"
              : "text-muted2 right-2.5",
          )}
          aria-hidden="true"
        >
          {rightIcon}
        </span>
      )}
    </div>
  );
}

export { Input };
export type { InputProps };
