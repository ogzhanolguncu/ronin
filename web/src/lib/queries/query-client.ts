import { QueryClient } from "@tanstack/react-query";

export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly code?: string;
  readonly details?: Record<string, string>;

  constructor(
    response: Response,
    body?: { error?: string; code?: string; details?: Record<string, string> },
  ) {
    super(body?.error ?? `${response.status} ${response.statusText}`);
    this.name = "API_ERROR";
    this.status = response.status;
    this.statusText = response.statusText;
    this.code = body?.code;
    this.details = body?.details;
  }
}

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
      throwOnError: true,
    },
    mutations: {
      throwOnError: false,
    },
  },
});
