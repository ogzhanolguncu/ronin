declare global {
  interface Window {
    __AUTH__: "authenticated" | "login" | undefined;
  }
}
export {};
