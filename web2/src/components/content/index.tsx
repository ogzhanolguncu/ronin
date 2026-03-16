import { ContentToolbar } from "./toolbar";

export function Content() {
  return (
    <main className="flex h-full flex-col overflow-hidden">
      <ContentToolbar />
      <div className="flex-1 overflow-y-auto">
        {/* future: bookmark cards */}
      </div>
    </main>
  );
}
