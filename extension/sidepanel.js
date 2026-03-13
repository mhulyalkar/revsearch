// RevSearch side panel

const API_BASE = "https://n8w258hjoi.execute-api.us-east-1.amazonaws.com/prod";

const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");
const resultsState = document.getElementById("results-state");
const errorState = document.getElementById("error-state");
const errorMessage = document.getElementById("error-message");
const retryBtn = document.getElementById("retry-btn");
const sourceImage = document.getElementById("source-image");
const resultsList = document.getElementById("results-list");
const tabs = document.querySelectorAll(".tab");

let currentResults = [];
let currentImageUrl = "";

const ENGINES = [
  {
    engine: "google",
    label: "Google Lens",
    icon: "\u{1F50D}",
    buildUrl: (url) => `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`
  },
  {
    engine: "bing",
    label: "Bing Visual Search",
    icon: "\u{1F50E}",
    buildUrl: (url) => `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(url)}`
  },
  {
    engine: "yandex",
    label: "Yandex Images",
    icon: "\u{1F30D}",
    buildUrl: (url) => `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(url)}`
  },
  {
    engine: "tineye",
    label: "TinEye",
    icon: "\u{1F441}\uFE0F",
    buildUrl: (url) => `https://tineye.com/search?url=${encodeURIComponent(url)}`
  }
];

// Listen for search triggers from storage
chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.pendingSearch?.newValue) {
    const { imageUrl } = changes.pendingSearch.newValue;
    chrome.storage.local.remove("pendingSearch");
    performSearch(imageUrl);
  }
});

// Check if there's a pending search on load
chrome.storage.local.get("pendingSearch", (data) => {
  if (data.pendingSearch) {
    const { imageUrl } = data.pendingSearch;
    chrome.storage.local.remove("pendingSearch");
    performSearch(imageUrl);
  }
});

function showState(state) {
  [emptyState, loadingState, resultsState, errorState].forEach(el => el.hidden = true);
  state.hidden = false;
}

async function performSearch(imageUrl) {
  currentImageUrl = imageUrl;
  sourceImage.src = imageUrl;
  showState(loadingState);

  try {
    // Step 1: Try to capture the image via content script and upload to S3
    const publicUrl = await uploadImageToS3(imageUrl);
    const searchUrl = publicUrl || imageUrl; // fallback to original URL

    // Step 2: Build search URLs with the public S3 URL
    currentResults = ENGINES.map(eng => ({
      engine: eng.engine,
      label: eng.label,
      icon: eng.icon,
      searchUrl: eng.buildUrl(searchUrl)
    }));

    // Step 3: Open all 4 engine tabs
    for (const result of currentResults) {
      chrome.tabs.create({ url: result.searchUrl, active: false });
    }

    renderResults("all");
    showState(resultsState);
  } catch (err) {
    console.error("Search error:", err);
    errorMessage.textContent = err.message || "Search failed. Please try again.";
    showState(errorState);
  }
}

async function uploadImageToS3(imageUrl) {
  try {
    // Ask content script to capture the image as base64
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return null;

    const captured = await chrome.tabs.sendMessage(tab.id, {
      action: "captureImage",
      imageUrl
    });

    if (!captured || captured.error || !captured.dataUrl) {
      console.warn("Could not capture image:", captured?.error);
      return null;
    }

    // Get presigned upload URL from our API
    const urlRes = await fetch(`${API_BASE}/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: captured.contentType })
    });

    if (!urlRes.ok) {
      console.warn("Failed to get upload URL");
      return null;
    }

    const { uploadUrl, publicUrl } = await urlRes.json();

    // Convert base64 data URL to blob
    const blob = dataUrlToBlob(captured.dataUrl);

    // Upload to S3 via presigned URL
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": captured.contentType },
      body: blob
    });

    if (!uploadRes.ok) {
      console.warn("S3 upload failed:", uploadRes.status);
      return null;
    }

    return publicUrl;
  } catch (err) {
    console.warn("Upload failed, falling back to original URL:", err);
    return null;
  }
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

function renderResults(engine) {
  resultsList.innerHTML = "";

  const filtered = engine === "all"
    ? currentResults
    : currentResults.filter(r => r.engine === engine);

  if (filtered.length === 0) {
    resultsList.innerHTML = '<p style="padding:20px;text-align:center;color:#666;">No results found.</p>';
    return;
  }

  const status = document.createElement("p");
  status.className = "search-status";
  status.textContent = `Opened ${filtered.length} search engine${filtered.length > 1 ? "s" : ""} in new tabs. Click below to reopen.`;
  resultsList.appendChild(status);

  filtered.forEach(result => {
    const a = document.createElement("a");
    a.className = "result-item";
    a.href = result.searchUrl;
    a.target = "_blank";
    a.innerHTML = `
      <div class="engine-icon">${result.icon}</div>
      <div class="result-info">
        <div class="result-title">${escapeHtml(result.label)}</div>
        <div class="result-url">Click to open reverse image search</div>
      </div>
    `;
    resultsList.appendChild(a);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderResults(tab.dataset.engine);
  });
});

// Retry button
retryBtn.addEventListener("click", () => {
  if (currentImageUrl) performSearch(currentImageUrl);
});
