import { useState, useEffect } from "react";
import "./App.css";

const API_BASE = "https://n8w258hjoi.execute-api.us-east-1.amazonaws.com/prod";

function App() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSearch(searchId) {
    await fetch(`${API_BASE}/history`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ searchId }),
    });
    setHistory(history.filter((h) => h.searchId !== searchId));
  }

  function getToken() {
    return localStorage.getItem("revsearch_token") || "";
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <header>
        <h1>RevSearch</h1>
        <p>Your search history</p>
      </header>
      <main>
        {history.length === 0 ? (
          <p className="empty">No searches yet. Use the Chrome extension to get started.</p>
        ) : (
          <div className="history-grid">
            {history.map((item) => (
              <div key={item.searchId} className="history-card">
                <img src={item.imageUrl} alt="Searched image" />
                <div className="card-info">
                  <span className="card-date">
                    {new Date(item.createdAt * 1000).toLocaleDateString()}
                  </span>
                  <span className="card-engines">
                    {item.results.length} engines searched
                  </span>
                  <button onClick={() => deleteSearch(item.searchId)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
