import { ApiError } from "./queries/query-client";

type RequesterInit = Omit<RequestInit, "body"> & {
  body?: RequestInit["body"] | Record<string, unknown>;
  params?: Record<string, string> | URLSearchParams;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !ArrayBuffer.isView(value) &&
    !(value instanceof Blob) &&
    !(value instanceof FormData) &&
    !(value instanceof URLSearchParams) &&
    !(value instanceof ReadableStream)
  );
}

export async function requester<T>(
  input: RequestInfo | URL,
  init?: RequesterInit,
): Promise<T> {
  let url = input;
  const { params, ...rest } = init ?? {};

  if (params) {
    const qs =
      params instanceof URLSearchParams ? params : new URLSearchParams(params);
    url = `${url}?${qs.toString()}`;
  }

  const { body, ...options } = rest;
  const fetchInit: RequestInit = { ...options };

  if (isPlainObject(body)) {
    fetchInit.body = JSON.stringify(body);
    fetchInit.headers = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
  } else {
    fetchInit.body = body as RequestInit["body"];
  }

  const response = await fetch(url, fetchInit);
  if (!response.ok) {
    let body:
      | { error?: string; code?: string; details?: Record<string, string> }
      | undefined;
    try {
      body = await response.json();
    } catch {
      // response body may not be JSON
    }
    throw new ApiError(response, body);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
