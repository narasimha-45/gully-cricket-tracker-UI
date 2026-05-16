import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";

export default function AnalyticsOverview() {
  const { globalFilter } = useOutletContext();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchSummary();
  }, [globalFilter]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const suffix = globalFilter && globalFilter !== "all" ? `/${globalFilter}` : "";
      
      const [batRes, bowlRes] = await Promise.all([
        fetch(`${API}/api/stats/leaderboard/batting${suffix}`),
        fetch(`${API}/api/stats/leaderboard/bowling${suffix}`)
      ]);

      const [batJson, bowlJson] = await Promise.all([batRes.json(), bowlRes.json()]);

      setData({
        topBatters: (batJson.data || []).slice(0, 3),
        topBowlers: (bowlJson.data || []).slice(0, 3)
      });
    } catch (err) {
      console.error("Failed to fetch overview", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={center}>
      <div style={spinner}></div>
      <p style={{ marginTop: 12, color: "#64748b" }}>Generating analytics summary...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* TOP BATTERS */}
      <div>
        <div style={sectionHeader}>
          <span style={{ fontSize: 18 }}>🏏</span>
          <h2 style={sectionTitle}>Leading Run Scorers</h2>
        </div>
        <div style={podiumRow}>
          {data?.topBatters.map((p, i) => (
            <div 
              key={p.name} 
              style={{ ...podiumCard, borderTopColor: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : "#b45309" }}
              onClick={() => navigate(`/player/${encodeURIComponent(p.name)}`)}
            >
              <div style={rankBadge}>{i + 1}</div>
              <div style={playerName}>{p.name}</div>
              <div style={statLabel}>{p.runs} runs</div>
              <div style={subStat}>{p.innings} inn · {p.derived?.strikeRate} SR</div>
            </div>
          ))}
        </div>
      </div>

      {/* TOP BOWLERS */}
      <div>
        <div style={sectionHeader}>
          <span style={{ fontSize: 18 }}>🥎</span>
          <h2 style={sectionTitle}>Top Wicket Takers</h2>
        </div>
        <div style={podiumRow}>
          {data?.topBowlers.map((p, i) => (
            <div 
              key={p.name} 
              style={{ ...podiumCard, borderTopColor: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : "#b45309" }}
              onClick={() => navigate(`/player/${encodeURIComponent(p.name)}`)}
            >
              <div style={rankBadge}>{i + 1}</div>
              <div style={playerName}>{p.name}</div>
              <div style={statLabel}>{p.wickets} wkts</div>
              <div style={subStat}>{p.derived?.economy} econ · {p.derived?.bowlingAverage} avg</div>
            </div>
          ))}
        </div>
      </div>

      <button style={fullLeaderboardBtn} onClick={() => navigate("../batting")}>
        View Detailed Leaderboards
      </button>
    </div>
  );
}

const center = { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0" };
const spinner = { width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: "3px solid #4f46e5", borderRadius: "50%", animation: "spin 0.8s linear infinite" };

const sectionHeader = { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingLeft: 4 };
const sectionTitle = { fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0 };

const podiumRow = { display: "flex", gap: 10 };
const podiumCard = { 
  flex: 1, 
  background: "white", 
  borderRadius: 16, 
  padding: "16px 12px", 
  border: "1px solid #e2e8f0", 
  borderTopWidth: 4, 
  textAlign: "center",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
  cursor: "pointer",
  transition: "transform 0.2s"
};

const rankBadge = { fontSize: 10, fontWeight: 800, background: "#f1f5f9", color: "#64748b", width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" };
const playerName = { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4, textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const statLabel = { fontSize: 16, fontWeight: 800, color: "#4f46e5", marginBottom: 4 };
const subStat = { fontSize: 10, color: "#94a3b8", fontWeight: 500 };

const fullLeaderboardBtn = {
  background: "white",
  border: "1px solid #e2e8f0",
  padding: "14px",
  borderRadius: 14,
  fontSize: 14,
  fontWeight: 600,
  color: "#475569",
  cursor: "pointer",
  marginTop: 10
};
