import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { BookmarkItem } from "./bookmark-item";
import { BookmarkSkeleton } from "./bookmark-skeleton";
import { BookmarkDetailSheet } from "./bookmark-detail-sheet";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import type { Bookmark } from "@/lib/types";

export const ITEMS_PER_PAGE = 10;

const MOCK_BOOKMARKS = [
  {
    id: 0,
    url: "https://www.are.na/block/example",
    title: "Everything-filled test bookmark — all fields visible",
    hostname: "are.na",
    description:
      "A long description to verify line-height and readability at leading-[1.8]. The text should feel spacious and comfortable — not cramped, not floating. Japanese aesthetics mandate generous leading for body copy.",
    notes:
      "A personal note that goes with this bookmark. Notes should be readable at 12px with enough contrast. If this feels hard to read, bump the opacity.",
    tags: ["design", "reference", "typography", "react", "computer", "science", "dark", "japanese", "design", "productivity"],
    date: "Mar 19, 2025",
    is_unread: true,
    is_archived: true,
    reader_mode_url: "#",
    web_archive_url: "#",
    assets: [
      { id: 1, name: "HTML snapshot from 19.03.2025", url: "#", size: "84.2 KB" },
      { id: 2, name: "Screenshot 2025-03-19.png", url: "#", size: "1.2 MB" },
    ],
  },
  {
    id: 1,
    url: "https://rauno.me",
    title: "Rauno Freiberg",
    hostname: "rauno.me",
    description: "Interface design and engineering.",
    tags: ["design", "inspiration"],
    date: "Mar 12, 2025",
    notes: "",
  },
  {
    id: 2,
    url: "https://linear.app",
    title: "Linear — Plan and build products",
    hostname: "linear.app",
    description:
      "Linear is a better way to build products. Streamline issues, projects, and product roadmaps.",
    tags: ["tools", "productivity"],
    date: "Mar 10, 2025",
    notes: "Great example of keyboard-first UX design.",
    is_unread: true,
    web_archive_url: "https://web.archive.org/web/20250310/https://linear.app",
    reader_mode_url: "#",
  },
  {
    id: 3,
    url: "https://writings.stephenwolfram.com/2023/02/what-is-chatgpt-doing-and-why-does-it-work/",
    title: "What Is ChatGPT Doing … and Why Does It Work?",
    hostname: "writings.stephenwolfram.com",
    description: "",
    tags: ["ai", "research"],
    date: "Feb 28, 2025",
    notes: "",
  },
  {
    id: 4,
    url: "https://www.robinsloan.com/lab/new-fonts/",
    title: "New fonts for the lab",
    hostname: "robinsloan.com",
    description:
      "Exploring typefaces that feel right for long-form reading on screens.",
    tags: ["typography"],
    date: "Feb 20, 2025",
    notes:
      "The serif choices here pair well with the kinari background aesthetic we use.",
    is_archived: true,
    assets: [{ id: 4, name: "HTML snapshot from 20.02.2025", url: "#", size: "42.1 KB" }],
  },
  {
    id: 5,
    url: "https://tailwindcss.com/docs",
    title: "Tailwind CSS Documentation",
    hostname: "tailwindcss.com",
    description: "",
    tags: ["css", "reference"],
    date: "Feb 15, 2025",
    notes: "",
  },
  {
    id: 6,
    url: "https://paco.me",
    title: "Paco Coursey",
    hostname: "paco.me",
    description: "Design engineer building interfaces and tools.",
    tags: ["design", "engineering"],
    date: "Feb 10, 2025",
    notes: "",
  },
  {
    id: 7,
    url: "https://worrydream.com/refs/Tufte_-_Envisioning_Information.pdf",
    title: "Envisioning Information — Edward Tufte",
    hostname: "worrydream.com",
    description:
      "Classic text on information design, visual explanations, and data density.",
    tags: ["design", "data-viz", "books"],
    date: "Jan 30, 2025",
    notes:
      "Chapter 3 on layering and separation is directly relevant to our card layout decisions.",
    web_archive_url: "https://web.archive.org/web/20250130/https://worrydream.com/refs/Tufte_-_Envisioning_Information.pdf",
    reader_mode_url: "#",
    assets: [{ id: 7, name: "PDF snapshot from 30.01.2025", url: "#", size: "128 KB" }],
  },
  {
    id: 8,
    url: "https://www.figma.com",
    title: "Figma — Collaborative design tool",
    hostname: "figma.com",
    description: "The collaborative interface design tool. Build products, design systems, and collaborate on anything.",
    tags: ["design", "tools"],
    date: "Mar 15, 2025",
    notes: "Essential for design handoff and component documentation.",
  },
  {
    id: 9,
    url: "https://github.com",
    title: "GitHub — Where the world builds software",
    hostname: "github.com",
    description: "GitHub is where over 100 million developers shape the future of software.",
    tags: ["development", "version-control"],
    date: "Mar 18, 2025",
    notes: "",
  },
];

const showSkeleton = false;

export const MOCK_BOOKMARKS_COUNT = MOCK_BOOKMARKS.length;

interface BookmarkListProps {
  currentPage: number;
}

export function BookmarkList({ currentPage }: BookmarkListProps) {
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const paginatedBookmarks = MOCK_BOOKMARKS.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  function handleViewClick(bookmark: Bookmark) {
    setSelectedBookmark(bookmark);
    setDetailOpen(true);
  }

  function handleDetailOpenChange(open: boolean) {
    setDetailOpen(open);
    if (!open) {
      setTimeout(() => setSelectedBookmark(null), 200);
    }
  }

  if (showSkeleton) {
    return (
      <div>
        {Array.from({ length: 7 }, (_, i) => (
          <BookmarkSkeleton key={i} delay={i * 0.08} />
        ))}
      </div>
    );
  }

  if (MOCK_BOOKMARKS.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted2 font-medium">Nothing here yet</p>
        <p className="text-xs text-muted2/60 font-light mt-1">
          Add your first bookmark to begin
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        {paginatedBookmarks.map((bookmark) => (
          <BookmarkItem
            key={bookmark.id}
            bookmark={bookmark}
            onTagClick={(tag) => console.log("filter by", tag)}
            onViewClick={handleViewClick}
          />
        ))}
      </div>
      <DialogPrimitive.Root open={detailOpen} onOpenChange={handleDetailOpenChange}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            data-slot="dialog-content"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[440px] bg-background rounded-xl ring-1 ring-foreground/8 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-1 duration-200 ease-out"
          >
            {selectedBookmark && <BookmarkDetailSheet bookmark={selectedBookmark} />}
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPrimitive.Root>
    </>
  );
}
