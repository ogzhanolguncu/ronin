import { ApiError } from "./query-client"

export async function requester<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    throw new ApiError(response)
  }
  return response.json() as Promise<T>
}
