import { api, ApiError } from "./lib/api";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-ronin",
    title: "Save to Rōnin",
    contexts: ["page", "link"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "save-to-ronin") return;
  const url = info.linkUrl || info.pageUrl;
  if (!url) return;
  const title = tab?.title || url;
  await quickSave(url, title);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-bookmark") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  await quickSave(tab.url, tab.title || tab.url);
});

async function quickSave(url: string, title: string) {
  try {
    await api.createBookmark({ url, title });
    notify("Bookmark saved", truncate(title, 50));
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409) {
        notify("Already exists", "This bookmark is already in Rōnin");
      } else if (err.status === 401) {
        notify("Not authenticated", "Open the Rōnin extension to log in");
      } else {
        notify("Save failed", err.message);
      }
    } else {
      notify("Save failed", "Unknown error");
    }
  }
}

function notify(title: string, message: string) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "../icons/icon-128.png",
    title,
    message,
  });
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "\u2026" : str;
}
