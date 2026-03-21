declare global {
  interface Window {
    __AUTH__: "authenticated" | "login" | undefined;
    __TAGS__?: { name: string; count: number }[];
  }
}
export {};
