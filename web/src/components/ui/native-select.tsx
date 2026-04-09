import * as React from "react";

import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default";
  variant?: "default" | "ghost";
};

function NativeSelect({
  className,
  size = "default",
  variant = "default",
  ...props
}: NativeSelectProps) {
  const isGhost = variant === "ghost";

  return (
    <div
      className={cn(
        "group/native-select relative w-fit has-[select:disabled]:opacity-50",
        className,
      )}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "text-foreground selection:bg-primary selection:text-primary-foreground w-full min-w-0 appearance-none py-1 text-sm transition-colors outline-none select-none disabled:pointer-events-none disabled:cursor-not-allowed",
          isGhost
            ? "text-muted2 hover:text-foreground cursor-pointer bg-transparent pr-5 pl-0 font-mono text-xs tracking-wide transition-colors duration-300 focus-visible:ring-0"
            : "border-border-soft bg-background placeholder:text-muted-foreground focus-visible:border-ring aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-8 rounded-sm border pr-8 pl-2.5 disabled:opacity-50 aria-invalid:ring-3 data-[size=sm]:h-7 data-[size=sm]:py-0.5",
        )}
        {...props}
      />
      <ChevronDownIcon
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 transition-all duration-300 select-none",
          isGhost
            ? "text-muted2 group-hover/native-select:text-foreground right-0 size-3"
            : "text-muted-foreground right-2.5 size-4",
        )}
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  );
}

function NativeSelectOption({ ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />;
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn(className)}
      {...props}
    />
  );
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
