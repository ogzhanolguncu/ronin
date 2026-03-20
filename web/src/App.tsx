import { Sidebar } from "./components/sidebar";
import { Content } from "./components/content";
import { useCursorGlow } from "./hooks/use-cursor-glow";

function App() {
  useCursorGlow();
  return (
    <><Sidebar /><Content /></>
  );
}

export default App;
