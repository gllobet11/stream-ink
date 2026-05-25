// background.js – StreamInk
// Handles keyboard shortcuts and toolbar icon click

// ===================== CROSS-BROWSER SHIM =====================
// Firefox/Waterfox expose `browser.*` (Promise-based, MV2).
// Chrome/Edge/Brave expose `chrome.*` (callback-based, MV3).
// Firefox also provides a `chrome` alias, but `browser` is the canonical one.
const api = typeof browser !== "undefined" ? browser : chrome;

// MV3 uses `api.action`; MV2 (Firefox/Waterfox) uses `api.browserAction`.
const actionAPI = api.action || api.browserAction;

// ===================== INJECTION =====================

// Inject CSS and JS into a tab.
// MV3  → uses chrome.scripting (requires "scripting" permission)
// MV2  → uses tabs.insertCSS / tabs.executeScript (requires host permissions)
async function injectContent(tabId) {
  if (api.scripting) {
    // MV3 path (Chrome, Edge, Brave, and Firefox ≥ 121 with MV3)
    await api.scripting.insertCSS({ target: { tabId }, files: ["overlay.css"] });
    await api.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  } else {
    // MV2 path (Firefox/Waterfox)
    await api.tabs.insertCSS(tabId, { file: "overlay.css" });
    await api.tabs.executeScript(tabId, { file: "content.js" });
  }
}

// Ensure content script is injected, then send a message
async function ensureContentScriptAndSend(tabId, message) {
  try {
    // Try sending directly first (content script already loaded)
    await api.tabs.sendMessage(tabId, message);
  } catch (err) {
    // Content script not loaded — inject it, then retry
    try {
      await injectContent(tabId);
      // Small delay to let the script initialize
      await new Promise((r) => setTimeout(r, 100));
      await api.tabs.sendMessage(tabId, message);
    } catch (injectErr) {
      console.warn("StreamInk: Cannot inject into this tab:", injectErr.message);
    }
  }
}

// Get the active tab and send a command
async function sendToActiveTab(message) {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await ensureContentScriptAndSend(tab.id, message);
  }
}

// ===================== LISTENERS =====================

// Keyboard shortcuts
api.commands.onCommand.addListener((command) => {
  sendToActiveTab({ action: command });
});

// Toolbar icon click
actionAPI.onClicked.addListener((tab) => {
  if (tab?.id) {
    ensureContentScriptAndSend(tab.id, { action: "toggle-draw" });
  }
});
