import { useState } from "react";
import { Sidebar } from "./components/sidebar";
import { Content } from "./components/content";
import { PassphraseGate } from "./components/passphrase-gate";

function App() {
  const [isUnlocked, setIsUnlocked] = useState(
    () => import.meta.env.DEV || window.__AUTH__ === "authenticated"
  );

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

  return (
    <div className="app">
      <Sidebar onLogout={handleLogout} />
      <Content />
    </div>
  );
}

export default App;
