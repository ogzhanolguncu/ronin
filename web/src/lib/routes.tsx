import { usePathname, navigate, route } from "./router";
import { PassphraseGate } from "@/components/passphrase-gate";
import { QueryBoundary } from "@/components/query-boundary";
import { ReaderView } from "@/components/content/reader-view";
import { MainLayout } from "@/components/main-layout";

export { navigate };

const routes = [
  route({
    path: "/auth",
    render: () => (
      <PassphraseGate
        onUnlock={() => {
          // Full reload — let the backend set window.__AUTH__
          window.location.href = "/";
        }}
      />
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
