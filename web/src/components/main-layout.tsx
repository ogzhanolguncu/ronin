import { Sidebar } from "./sidebar";
import { Content } from "./content";

export function MainLayout() {
  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      // Full reload — let the backend serve fresh auth state
      window.location.href = "/auth";
    }
  };

  return (
    <div className="app">
      <Sidebar onLogout={handleLogout} />
      <Content />
    </div>
  );
}
