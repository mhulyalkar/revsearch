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
    const response = await fetch(`${API_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl })
    });

    if (!response.ok) throw new Error(`Search failed: ${response.status}`);

    const data = await response.json();
    currentResults = data.results;
    renderResults("all");
    showState(resultsState);
  } catch (err) {
    errorMessage.textContent = err.message || "Search failed. Please try again.";
    showState(errorState);
  }
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

  filtered.forEach(result => {
    const a = document.createElement("a");
    a.className = "result-item";
    a.href = result.url;
    a.target = "_blank";
    a.innerHTML = `
      ${result.thumbnail ? `<img class="result-thumb" src="${escapeHtml(result.thumbnail)}" alt="">` : ""}
      <div class="result-info">
        <div class="result-title">${escapeHtml(result.title || result.url)}</div>
        <div class="result-url">${escapeHtml(result.url)}</div>
        ${engine === "all" ? `<div class="result-engine">${escapeHtml(result.engine)}</div>` : ""}
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
