const STORAGE_KEY = "ronin_server_url"
const isDev = typeof chrome === "undefined" || !chrome.storage

export async function getServerUrl(): Promise<string> {
  if (isDev) return localStorage.getItem(STORAGE_KEY) || ""
  const data = await chrome.storage.local.get(STORAGE_KEY)
  return data[STORAGE_KEY] as string || ""
}

export async function setServerUrl(url: string): Promise<void> {
  const normalized = url.replace(/\/+$/, "")
  if (isDev) {
    localStorage.setItem(STORAGE_KEY, normalized)
    return
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: normalized })
}
