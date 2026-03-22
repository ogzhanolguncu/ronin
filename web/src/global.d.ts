declare global {
  interface Window {
    __AUTH__: "authenticated" | "login" | undefined;
    __TAGS__?: { name: string; count: number }[];
    __COLLECTIONS__?: { id: number; name: string; slug: string; color_id: number; created_at: number; updated_at: number }[];
  }
}
export {};
