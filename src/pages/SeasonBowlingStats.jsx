import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function SeasonBowlingStats() {
  const { seasonId } = useParams();
  const API = import.meta.env.VITE_API_BASE_URL;

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState("wickets");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch(`${API}/api/stats/season/${seasonId}/bowling`);
        const json = await res.json();
        setPlayers(json.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [seasonId]);

  /* ---------- HELPERS ---------- */

  const ballsToOvers = (balls = 0) => balls / 6;

  const calcEco = (runs, balls) => {
    if (!balls) return "0.00";
    return (runs / ballsToOvers(balls)).toFixed(2);
  };

  const calcAvg = (runs, wickets) => {
    if (!wickets) return "–";
    return (runs / wickets).toFixed(2);
  };

  const getEco = (p) => {
    if (!p.balls) return 0;
    return p.runs / (p.balls / 6);
  };

  const getAvg = (p) => {
    if (!p.wickets) return 0;
    return p.runs / p.wickets;
  };

  /* ---------- SORT ---------- */

  const sortedPlayers = [...players].sort((a, b) => {
    let av = 0;
    let bv = 0;

    switch (sortKey) {
      case "innings":
        av = a.innings;
        bv = b.innings;
        break;
      case "wickets":
        av = a.wickets;
        bv = b.wickets;
        break;
      case "runs":
        av = a.runs;
        bv = b.runs;
        break;
      case "balls":
        av = a.balls;
        bv = b.balls;
        break;
      case "eco":
        av = getEco(a);
        bv = getEco(b);
        break;
      case "avg":
        av = getAvg(a);
        bv = getAvg(b);
        break;
      default:
        av = 0;
        bv = 0;
    }

    return sortDir === "asc" ? av - bv : bv - av;
  });

  /* ---------- SORT HEADER ---------- */

  const SortHeader = ({ label, col }) => (
    <span
      style={sortableHeader}
      onClick={() => {
        if (sortKey === col) {
          setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
          setSortKey(col);
          setSortDir("desc");
        }
      }}
    >
      {label}
      {sortKey === col && (sortDir === "asc" ? " ▲" : " ▼")}
    </span>
  );

  /* ---------- UI ---------- */

  if (loading) {
    return (
      <p style={{ textAlign: "center", color: "#6b7280", marginTop: 40 }}>
        Loading bowling stats…
      </p>
    );
  }

  return (
    <div style={page}>
      {/* HEADER */}
      <div style={{ ...rowBase, ...headerRow }}>
        <span style={playerHeader}>Player</span>
        <SortHeader label="I" col="innings" />
        <SortHeader label="W" col="wickets" />
        <SortHeader label="R" col="runs" />
        <SortHeader label="B" col="balls" />
        <SortHeader label="Eco" col="eco" />
        <SortHeader label="Avg" col="avg" />
      </div>

      {/* ROWS */}
      {sortedPlayers.map((p) => (
        <div key={p._id} style={{ ...rowBase, ...dataRow }}>
          <span style={playerCell}>{p.name}</span>
          <span style={center}>{p.innings}</span>
          <span style={wickets}>{p.wickets}</span>
          <span style={center}>{p.runs}</span>
          <span style={center}>{p.balls}</span>
          <span style={eco}>{calcEco(p.runs, p.balls)}</span>
          <span style={avg}>{calcAvg(p.runs, p.wickets)}</span>
        </div>
      ))}

      {sortedPlayers.length === 0 && (
        <p style={emptyText}>No bowling data available</p>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const page = {
  padding: 12,
};

const rowBase = {
  display: "grid",
  gridTemplateColumns: "2.6fr repeat(6, 1fr)",
  alignItems: "center",
  padding: "10px 12px",
};

const headerRow = {
  fontSize: 12,
  fontWeight: 700,
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
  marginBottom: 8,
};

const dataRow = {
  background: "#ffffff",
  borderRadius: 14,
  marginBottom: 10,
  boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
  fontSize: 14,
};

const playerHeader = {
  textAlign: "left",
};

const playerCell = {
  fontWeight: 700,
  color: "#111827",
  textAlign: "left",
};

const center = {
  textAlign: "center",
  fontWeight: 600,
  color: "#374151",
};

const wickets = {
  textAlign: "center",
  fontWeight: 800,
  color: "#dc2626",
};

const eco = {
  textAlign: "center",
  fontWeight: 700,
  color: "#1e40af",
};

const avg = {
  textAlign: "center",
  fontWeight: 700,
  color: "#047857",
};

const sortableHeader = {
  textAlign: "center",
  cursor: "pointer",
  userSelect: "none",
};

const emptyText = {
  textAlign: "center",
  color: "#6b7280",
  marginTop: 40,
};
