import { lazy } from "react";
import { usePathname, navigate, route } from "./router";
import { QueryBoundary } from "@/components/query-boundary";
import { MainLayout } from "@/components/main-layout";

const PassphraseGate = lazy(() => import("@/components/passphrase-gate"));
const ReaderView = lazy(() => import("@/components/content/reader-view"));

const routes = [
  route({
    path: "/auth",
    render: () => (
      <QueryBoundary>
        <PassphraseGate
          onUnlock={() => {
            window.location.href = "/";
          }}
        />
      </QueryBoundary>
    ),
  }),
  route({
    path: "/reader/:id",
    render: (p) => (
      <QueryBoundary>
        <ReaderView bookmarkId={Number(p.id)} onClose={() => navigate("/")} />
      </QueryBoundary>
    ),
  }),
  route({
    path: "/",
    render: () => <MainLayout />,
  }),
];

export function Router() {
  const pathname = usePathname();

  for (const r of routes) {
    const match = pathname.match(r.re);
    if (!match) continue;
    return r.render(match.groups ?? {});
  }

  // Unknown route — redirect to home
  navigate("/", { replace: true });
  return null;
}
