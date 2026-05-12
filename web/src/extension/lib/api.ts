import type { Bookmark, CollectionsResponse } from "@/lib/types";
import { getServerUrl } from "./storage";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: object;
};

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const serverUrl = await getServerUrl();
  if (!serverUrl) throw new ApiError(0, "Server URL not configured");

  const { body, ...rest } = options;
  const init: RequestInit = { credentials: "include", ...rest };

  if (body) {
    init.body = JSON.stringify(body);
    init.headers = {
      "Content-Type": "application/json",
      ...(rest.headers as Record<string, string>),
    };
  }

  let response: Response;
  try {
    response = await fetch(`${serverUrl}${path}`, init);
  } catch {
    throw new ApiError(0, "Cannot reach server");
  }

  if (!response.ok) {
    let errBody: { error?: string; code?: string } | undefined;
    try {
      errBody = await response.json();
    } catch {
      // Non-JSON error body — fall through with status-based message.
    }
    throw new ApiError(
      response.status,
      errBody?.error ?? `HTTP ${response.status}`,
      errBody?.code,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface TagsResponse {
  tags: { name: string; count: number }[];
}

export interface MetadataResponse {
  url: string;
  title: string;
  description: string;
  favicon: string;
  preview_image?: string;
}

export interface CreateBookmarkInput {
  url: string;
  title: string;
  description?: string;
  notes?: string;
  tags?: string;
  favorite?: boolean;
  collection_id?: number | null;
}

export const api = {
  login: (passphrase: string) =>
    request<{ authenticated: boolean }>("/api/v1/auth/login", {
      method: "POST",
      body: { passphrase },
    }),

  logout: () =>
    request<{ authenticated: boolean }>("/api/v1/auth/logout", {
      method: "POST",
    }),

  getCollections: () => request<CollectionsResponse>("/api/v1/collections"),

  getTags: () => request<TagsResponse>("/api/v1/tags"),

  getMetadata: (url: string) =>
    request<MetadataResponse>(
      `/api/v1/metadata?url=${encodeURIComponent(url)}`,
    ),

  createBookmark: (data: CreateBookmarkInput) =>
    request<Bookmark>("/api/v1/bookmarks", { method: "POST", body: data }),

  updateBookmark: (id: number, data: CreateBookmarkInput) =>
    request<void>(`/api/v1/bookmarks/${id}`, { method: "PUT", body: data }),

  getBookmarkByUrl: async (url: string): Promise<Bookmark | null> => {
    try {
      return await request<Bookmark>(
        `/api/v1/bookmarks/exists?url=${encodeURIComponent(url)}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
};
