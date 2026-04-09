import { useState } from "react";
import { Sidebar } from "./components/sidebar";
import { Content } from "./components/content";
import { PassphraseGate } from "./components/passphrase-gate";
import { ReaderView } from "./components/content/reader-view";
import { QueryBoundary } from "./components/query-boundary";

function App() {
  const [isUnlocked, setIsUnlocked] = useState(
    () => import.meta.env.DEV || window.__AUTH__ === "authenticated",
  );
  const [readerBookmarkId, setReaderBookmarkId] = useState<number | null>(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setIsUnlocked(false);
    }
  };

  if (!isUnlocked) {
    return <PassphraseGate onUnlock={() => setIsUnlocked(true)} />;
  }

  if (readerBookmarkId !== null) {
    return (
      <QueryBoundary>
        <ReaderView
          bookmarkId={readerBookmarkId}
          onClose={() => setReaderBookmarkId(null)}
        />
      </QueryBoundary>
    );
  }

  return (
    <div className="app">
      <Sidebar onLogout={handleLogout} />
      <Content onOpenReader={setReaderBookmarkId} />
    </div>
  );
}

export default App;
