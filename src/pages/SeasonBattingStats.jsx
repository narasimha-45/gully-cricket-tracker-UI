import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function SeasonBattingStats() {
  const { seasonId } = useParams();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_BASE_URL;

  const [sortKey, setSortKey] = useState("runs");
  const [sortDir, setSortDir] = useState("desc");

  const getSR = (p) => (p.balls ? (p.runs / p.balls) * 100 : 0);

  const getAvg = (p) => {
    const outs = p.innings - (p.notOuts || 0);
    if (outs <= 0) return 0;
    return p.runs / outs;
  };

  const sortedPlayers = [...players].sort((a, b) => {
    let av = 0;
    let bv = 0;

    switch (sortKey) {
      case "runs":
        av = a.runs;
        bv = b.runs;
        break;

      case "sr":
        av = getSR(a);
        bv = getSR(b);
        break;

      case "avg":
        av = getAvg(a);
        bv = getAvg(b);
        break;

      case "fours":
        av = a.fours;
        bv = b.fours;
        break;

      case "ducks":
        av = a.ducks;
        bv = b.ducks;
        break;

      default:
        av = 0;
        bv = 0;
    }

    return sortDir === "asc" ? av - bv : bv - av;
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch(`${API}/api/stats/season/${seasonId}/batting`);
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

  const calcSR = (runs, balls) => {
    if (!balls) return "0.00";
    return ((runs / balls) * 100).toFixed(2);
  };

  if (loading) {
    return (
      <p style={{ textAlign: "center", color: "#6b7280", marginTop: 40 }}>
        Loading batting stats…
      </p>
    );
  }

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

  return (
    <div style={page}>
      {/* HEADER */}
      <div style={{ ...rowBase, ...headerRow }}>
        <span style={playerHeader}>Player</span>
        <SortHeader label="I" col="innings" />
        <SortHeader label="R" col="runs" />
        <SortHeader label="SR" col="sr" />
        <SortHeader label="4s" col="fours" />
        <SortHeader label="0s" col="ducks" />
      </div>

      {/* ROWS */}
      {sortedPlayers.map((p) => (
        <div key={p._id} style={{ ...rowBase, ...dataRow }}>
          <span style={playerCell}>{p.name}</span>
          <span style={center}>{p.innings}</span>
          <span style={runs}>{p.runs}</span>
          <span style={sr}>{calcSR(p.runs, p.balls)}</span>
          <span style={center}>{p.fours}</span>
          <span style={center}>{p.ducks}</span>
        </div>
      ))}

      {players.length === 0 && (
        <p style={emptyText}>No batting data available</p>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const sortableHeader = {
  textAlign: "center",
  cursor: "pointer",
  userSelect: "none",
};

const sr = {
  textAlign: "center",
  fontWeight: 700,
  color: "#1e40af", // blue
};

const avg = {
  textAlign: "center",
  fontWeight: 700,
  color: "#047857", // green
};

const page = {
  padding: 12,
};

/* SHARED GRID (CRITICAL) */
const rowBase = {
  display: "grid",
  gridTemplateColumns: "2.6fr repeat(5, 1fr)", // unchanged count
  alignItems: "center",
  padding: "10px 12px",
};

/* HEADER */
const headerRow = {
  fontSize: 12,
  fontWeight: 700,
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
  marginBottom: 8,
};

/* DATA ROW */
const dataRow = {
  background: "#ffffff",
  borderRadius: 14,
  marginBottom: 10,
  boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
  fontSize: 14,
};

/* CELLS */
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

const runs = {
  textAlign: "center",
  fontWeight: 800,
  color: "#4f46e5",
};

const emptyText = {
  textAlign: "center",
  color: "#6b7280",
  marginTop: 40,
};
