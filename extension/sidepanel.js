// RevSearch side panel

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

function performSearch(imageUrl) {
  currentImageUrl = imageUrl;
  sourceImage.src = imageUrl;

  // Build results client-side — no API call needed for URL-scheme search
  currentResults = ENGINES.map(eng => ({
    engine: eng.engine,
    label: eng.label,
    icon: eng.icon,
    searchUrl: eng.buildUrl(imageUrl)
  }));

  // Open all 4 engine tabs automatically
  currentResults.forEach(result => {
    chrome.tabs.create({ url: result.searchUrl, active: false });
  });

  renderResults("all");
  showState(resultsState);
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

  // Status message
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
