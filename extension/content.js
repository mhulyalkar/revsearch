// RevSearch content script

let selectionMode = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "startImageSelection") {
    startImageSelection();
  }
});

function startImageSelection() {
  selectionMode = true;
  document.body.style.cursor = "crosshair";

  document.addEventListener("mouseover", highlightImage);
  document.addEventListener("mouseout", unhighlightImage);
  document.addEventListener("click", selectImage, { once: true });
}

function highlightImage(e) {
  if (!selectionMode || e.target.tagName !== "IMG") return;
  e.target.style.outline = "3px solid #4285f4";
  e.target.style.outlineOffset = "2px";
}

function unhighlightImage(e) {
  if (!selectionMode || e.target.tagName !== "IMG") return;
  e.target.style.outline = "";
  e.target.style.outlineOffset = "";
}

function selectImage(e) {
  if (!selectionMode) return;
  selectionMode = false;
  document.body.style.cursor = "";
  document.removeEventListener("mouseover", highlightImage);
  document.removeEventListener("mouseout", unhighlightImage);

  if (e.target.tagName === "IMG" && e.target.src) {
    e.preventDefault();
    e.target.style.outline = "";
    e.target.style.outlineOffset = "";

    chrome.storage.local.set({ pendingSearch: { imageUrl: e.target.src } });
    chrome.runtime.sendMessage({ action: "openSidePanel" });
  }
}
