import { useEffect, useState } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { useSeasonStats } from "../context/SeasonStatsContext";
import { formatName } from "../utils/helpers";

export default function BowlingStats({ isOverall = false }) {
  const { seasonId } = useParams();
  const navigate = useNavigate();

  const outletContext = useOutletContext();
  const globalFilter = isOverall ? (outletContext?.globalFilter || "all") : null;

  const context = useSeasonStats();

  const bowlingStats = !isOverall ? context?.bowlingStats : null;

  const setBowlingStats = !isOverall ? context?.setBowlingStats : null;

  const API = import.meta.env.VITE_API_BASE_URL;

  /* =====================================
     OVERALL LOCAL STATE
  ===================================== */

  const [overallStats, setOverallStats] = useState(null);

  const players = isOverall ? overallStats || [] : bowlingStats || [];

  const [loading, setLoading] = useState(false);

  const [sortKey, setSortKey] = useState("wickets");

  const [sortDir, setSortDir] = useState("desc");

  /* =====================================
     LOAD ONLY ONCE
  ===================================== */

  useEffect(() => {
    if (!isOverall && bowlingStats) return;

    loadStats();
  }, [seasonId, isOverall, globalFilter]);

  /* =====================================
     FETCH
  ===================================== */

  const loadStats = async () => {
    try {
      setLoading(true);

      let endpoint;
      if (isOverall) {
        endpoint = globalFilter === "all" 
          ? `${API}/api/stats/leaderboard/bowling`
          : `${API}/api/stats/leaderboard/bowling/${globalFilter}`;
      } else {
        endpoint = `${API}/api/stats/leaderboard/bowling/${seasonId}`;
      }

      const res = await fetch(endpoint);

      const json = await res.json();

      if (isOverall) {
        setOverallStats(json.data || []);
      } else {
        setBowlingStats(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================
     HELPERS
  ===================================== */

  const ballsToOvers = (balls = 0) => {
    const overs = Math.floor(balls / 6);

    const rem = balls % 6;

    return `${overs}.${rem}`;
  };

  /* =====================================
     SORT
  ===================================== */

  const sortedPlayers = [...players].sort((a, b) => {
    let av = 0;
    let bv = 0;

    switch (sortKey) {
      case "best":
        av = (a.bestBowling?.wickets || 0) * 1000 - (a.bestBowling?.runs || 0);

        bv = (b.bestBowling?.wickets || 0) * 1000 - (b.bestBowling?.runs || 0);

        break;
      case "innings":
        av = a.innings || 0;
        bv = b.innings || 0;
        break;

      case "wickets":
        av = a.wickets || 0;
        bv = b.wickets || 0;
        break;

      case "balls":
        av = a.balls || 0;
        bv = b.balls || 0;
        break;

      case "eco":
        av = Number(a.derived?.economy || 0);

        bv = Number(b.derived?.economy || 0);

        break;

      case "avg":
        av = Number(a.derived?.bowlingAverage || 0);

        bv = Number(b.derived?.bowlingAverage || 0);

        break;

      default:
        av = 0;
        bv = 0;
    }

    return sortDir === "asc" ? av - bv : bv - av;
  });

  /* =====================================
     SORT HEADER
  ===================================== */

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

  /* =====================================
     LOADING
  ===================================== */

  if (loading && players.length === 0) {
    return (
      <div style={loadingWrap}>
        <div style={spinner}></div>

        <p style={loadingText}>Loading bowling stats...</p>
      </div>
    );
  }

  /* =====================================
     UI
  ===================================== */

  return (
    <div style={page}>
      {/* HEADER */}

      <div
        style={{
          ...rowBase,
          ...headerRow,
        }}
      >
        <span style={playerHeader}>Player</span>

        <SortHeader label="I" col="innings" />

        <SortHeader label="W" col="wickets" />

        <SortHeader label="O" col="balls" />

        <SortHeader label="Eco" col="eco" />

        <SortHeader label="Avg" col="avg" />

        <SortHeader label="Best" col="best" />
      </div>

      {/* ROWS */}

      {sortedPlayers.map((p) => (
        <div
          key={p.name}
          style={{
            ...rowBase,
            ...dataRow,
          }}
        >
          <span 
            style={{ ...playerCell, cursor: "pointer", color: "#4f46e5" }}
            onClick={() => navigate(`/player/${encodeURIComponent(p.name)}`)}
          >
            {formatName(p.name)}
          </span>

          <span style={center}>{p.innings || 0}</span>

          <span style={wickets}>{p.wickets}</span>

          <span style={center}>{ballsToOvers(p.balls)}</span>

          <span style={eco}>{p.derived?.economy || "0.00"}</span>

          <span style={avg}>{p.derived?.bowlingAverage || "0.00"}</span>

          <span style={best}>
            {p.bestBowling?.wickets || 0}/{p.bestBowling?.runs || 0}
          </span>
        </div>
      ))}

      {/* EMPTY */}

      {players.length === 0 && (
        <div style={emptyWrap}>
          <p style={emptyTitle}>No bowling stats</p>

          <p style={emptySub}>Completed matches will appear here</p>
        </div>
      )}
    </div>
  );
}

/* =========================================
   STYLES
========================================= */

const page = {
  display: "flex",

  flexDirection: "column",

  gap: 10,
};

const rowBase = {
  display: "grid",

  gridTemplateColumns: "2.8fr repeat(6,1fr)",

  alignItems: "center",
};

const headerRow = {
  position: "sticky",

  top: "var(--stats-header-top, 68px)",

  zIndex: 70,

  margin: "0 -18px 8px -18px",

  padding: "10px 32px 8px",

  background: "rgba(248, 250, 252, 0.96)",

  backdropFilter: "blur(12px)",

  fontSize: 12,

  fontWeight: 700,

  color: "#64748b",
};

const dataRow = {
  background: "#ffffff",

  padding: "14px",

  borderRadius: 18,

  boxShadow: "0 2px 10px rgba(15,23,42,0.05)",

  border: "1px solid #eef2ff",

  fontSize: 14,
};

const sortableHeader = {
  textAlign: "center",

  cursor: "pointer",

  userSelect: "none",
};

const playerHeader = {
  textAlign: "left",
};

const playerCell = {
  fontWeight: 700,

  color: "#111827",

  textAlign: "left",

  fontSize: 14,
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

  color: "#2563eb",
};

const avg = {
  textAlign: "center",

  fontWeight: 700,

  color: "#059669",
};

const best = {
  textAlign: "center",

  fontWeight: 800,

  color: "#7c3aed",
};

const loadingWrap = {
  display: "flex",

  flexDirection: "column",

  alignItems: "center",

  justifyContent: "center",

  marginTop: 50,
};

const loadingText = {
  marginTop: 14,

  color: "#64748b",

  fontSize: 14,
};

const spinner = {
  width: 28,

  height: 28,

  border: "3px solid #e0e7ff",

  borderTop: "3px solid #4338ca",

  borderRadius: "50%",

  animation: "spin 0.8s linear infinite",
};

const emptyWrap = {
  marginTop: 40,

  textAlign: "center",
};

const emptyTitle = {
  fontSize: 16,

  fontWeight: 700,

  color: "#111827",
};

const emptySub = {
  marginTop: 6,

  color: "#64748b",

  fontSize: 14,
};
