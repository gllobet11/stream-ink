// background.js – StreamInk
// Handles keyboard shortcuts and toolbar icon click

// Ensure content script is injected, then send a message
async function ensureContentScriptAndSend(tabId, message) {
  try {
    // Try sending directly first (content script already loaded)
    await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    // Content script not loaded — inject it, then retry
    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ["overlay.css"],
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });
      // Small delay to let the script initialize
      await new Promise((r) => setTimeout(r, 100));
      await chrome.tabs.sendMessage(tabId, message);
    } catch (injectErr) {
      console.warn("StreamInk: Cannot inject into this tab:", injectErr.message);
    }
  }
}

// Get the active tab and send a command
async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await ensureContentScriptAndSend(tab.id, message);
  }
}

// Keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  sendToActiveTab({ action: command });
});

// Toolbar icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab?.id) {
    ensureContentScriptAndSend(tab.id, { action: "toggle-draw" });
  }
});
