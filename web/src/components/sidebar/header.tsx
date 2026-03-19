import { useTheme } from "@/hooks/use-theme";
import { Button } from "../ui/button";
import { MoonIcon, SunIcon } from "../ui/icons";

export const Header = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="border-border-soft flex h-24 shrink-0 flex-col justify-center border-b px-4">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center">
          <span className="text-foreground text-base font-semibold tracking-tight">
            Zanshin
          </span>
          <span className="bg-shu mb-1.5 ml-0.5 inline-block size-1.5 shrink-0 rounded-[1px] shadow-[0_0_3px_oklch(0.55_0.14_30/0.3)]" />
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
      <div className="text-muted2 font-jp mt-1.5 text-sm tracking-wider">
        残心
      </div>
    </div>
  );
};
