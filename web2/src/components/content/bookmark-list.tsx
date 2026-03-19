import { BookmarkItem } from "./bookmark-item";
import { BookmarkSkeleton } from "./bookmark-skeleton";

const MOCK_BOOKMARKS = [
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

export function BookmarkList() {
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
    <div>
      {MOCK_BOOKMARKS.map((bookmark) => (
        <BookmarkItem
          key={bookmark.id}
          bookmark={bookmark}
          onTagClick={(tag) => console.log("filter by", tag)}
        />
      ))}
    </div>
  );
}
