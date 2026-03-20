import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);
  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  return (
    <div className="pb-6 pt-0">
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-foreground/8 to-transparent" />
      <nav className="flex items-center justify-center gap-1 font-mono text-xs pt-5 tracking-wide">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirst}
          className={`px-2 py-1 transition-colors duration-[400ms] ease-out ${isFirst ? "opacity-30 pointer-events-none" : "text-muted2 hover:text-text2"}`}
        >
          <ChevronLeftIcon size={14} />
        </button>

        {pages.map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="text-muted2/50 select-none pointer-events-none px-2 py-1">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-2 py-1 transition-colors duration-[400ms] ease-out ${
                page === currentPage
                  ? "text-foreground"
                  : "text-muted2 hover:text-text2"
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLast}
          className={`px-2 py-1 transition-colors duration-[400ms] ease-out ${isLast ? "opacity-30 pointer-events-none" : "text-muted2 hover:text-text2"}`}
        >
          <ChevronRightIcon size={14} />
        </button>
      </nav>
    </div>
  );
}
