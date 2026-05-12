import { cva } from "class-variance-authority";

export const inputVariants = cva(
  "w-full min-w-0 bg-background text-sm text-foreground outline-none transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "h-8 rounded-sm border border-border-soft px-2.5 py-1 file:inline-flex file:h-6 file:border-0 placeholder:text-muted-foreground focus-visible:border-ring disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        ghost: "bg-transparent text-sm tracking-wide placeholder:text-muted2",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
