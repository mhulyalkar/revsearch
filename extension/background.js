// RevSearch background service worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "revsearch-image",
    title: "RevSearch this image",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "revsearch-image" && info.srcUrl) {
    chrome.sidePanel.open({ tabId: tab.id });
    chrome.storage.local.set({ pendingSearch: { imageUrl: info.srcUrl } });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "startImageSelection" });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "openSidePanel" && sender.tab) {
    chrome.sidePanel.open({ tabId: sender.tab.id });
  }
});
