// RevSearch content script

let selectionMode = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startImageSelection") {
    startImageSelection();
  }
  if (message.action === "captureImage") {
    captureImageAsBlob(message.imageUrl).then(sendResponse);
    return true; // keep channel open for async response
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

// Capture an image element as a base64 data URL via canvas
async function captureImageAsBlob(imageUrl) {
  try {
    // Find the image on the page
    const img = document.querySelector(`img[src="${CSS.escape(imageUrl)}"]`)
      || document.querySelector(`img[src="${imageUrl}"]`);

    if (img && img.complete && img.naturalWidth > 0) {
      return canvasCapture(img);
    }

    // Fallback: create a new image and load it
    return new Promise((resolve) => {
      const tempImg = new Image();
      tempImg.crossOrigin = "anonymous";
      tempImg.onload = () => resolve(canvasCapture(tempImg));
      tempImg.onerror = () => resolve({ error: "Failed to load image" });
      tempImg.src = imageUrl;
    });
  } catch (err) {
    return { error: err.message };
  }
}

function canvasCapture(img) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    return { dataUrl, contentType: "image/jpeg" };
  } catch (err) {
    // CORS-tainted canvas — can't extract pixels
    return { error: "Canvas tainted: " + err.message };
  }
}
