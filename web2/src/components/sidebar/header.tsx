import { useTheme } from "@/hooks/use-theme";
import { Button } from "../ui/button";
import { MoonIcon, SunIcon } from "../ui/icons";

export const Header = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="border-border flex h-[68px] shrink-0 flex-col justify-center border-b px-4">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center">
          <span className="text-foreground text-base font-semibold tracking-tight">
            Masâr
          </span>
          <span className="bg-primary mb-1.5 ml-0.5 inline-block size-1.5 shrink-0 rounded-full" />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <SunIcon className="size-3.5" />
          ) : (
            <MoonIcon className="size-3.5" />
          )}
        </Button>
      </div>
      <div className="text-muted-foreground mt-1 font-mono text-xs font-light tracking-wider opacity-60">
        مسار
      </div>
    </div>
  );
};
