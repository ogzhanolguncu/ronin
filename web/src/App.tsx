import { useState } from "react";
import { Sidebar } from "./components/sidebar";
import { Content } from "./components/content";
import { PassphraseGate } from "./components/passphrase-gate";

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  if (!isUnlocked) {
    return <PassphraseGate onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="app">
      <Sidebar />
      <Content />
    </div>
  );
}

export default App;
