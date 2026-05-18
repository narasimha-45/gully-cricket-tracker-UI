import { useEffect, useState } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { useSeasonStats } from "../context/SeasonStatsContext";
import { formatName } from "../utils/helpers";

export default function MiscStats({ isOverall = false }) {
  const { seasonId } = useParams();
  const navigate = useNavigate();

  const outletContext = useOutletContext();
  const globalFilter = isOverall ? (outletContext?.globalFilter || "all") : null;

  const context = useSeasonStats();

  const miscStats = !isOverall ? context?.miscStats : null;

  const setMiscStats = !isOverall ? context?.setMiscStats : null;

  const API = import.meta.env.VITE_API_BASE_URL;

  /* =====================================
     OVERALL LOCAL STATE
  ===================================== */

  const [overallStats, setOverallStats] = useState(null);

  const players = isOverall ? overallStats || [] : miscStats || [];

  const [loading, setLoading] = useState(false);

  const [sortKey, setSortKey] = useState("manOfTheMatch");

  const [sortDir, setSortDir] = useState("desc");

  /* =====================================
     LOAD ONLY ONCE
  ===================================== */

  useEffect(() => {
    if (!isOverall && miscStats) return;

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
          ? `${API}/api/stats/leaderboard/fielding`
          : `${API}/api/stats/leaderboard/fielding/${globalFilter}`;
      } else {
        endpoint = `${API}/api/stats/leaderboard/fielding/${seasonId}`;
      }

      const res = await fetch(endpoint);

      

      const json = await res.json();

      console.log(json);
      if (isOverall) {
        setOverallStats(json.data || []);
      } else {
        setMiscStats(json.data || []);
      }
    } catch (e) {
      console.error("Failed to load misc stats", e);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================
     SORT
  ===================================== */

  const sortedPlayers = [...players].sort((a, b) => {
    let av = 0;
    let bv = 0;

    switch (sortKey) {
      case "catches":
        av = a.catches || 0;
        bv = b.catches || 0;
        break;

      case "stumpings":
        av = a.stumpings || 0;
        bv = b.stumpings || 0;
        break;

      case "runOuts":
        av = a.runOuts || 0;
        bv = b.runOuts || 0;
        break;

      case "manOfTheMatch":
        av = a.manOfTheMatch || 0;

        bv = b.manOfTheMatch || 0;

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

        <p style={loadingText}>Loading misc stats...</p>
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

        <SortHeader label="C" col="catches" />

        <SortHeader label="ST" col="stumpings" />

        <SortHeader label="RO" col="runOuts" />

        <SortHeader label="MoM" col="manOfTheMatch" />
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

          <span style={center}>{p.catches || 0}</span>

          <span style={center}>{p.stumpings || 0}</span>

          <span style={center}>{p.runOuts || 0}</span>

          <span style={mom}>{p.manOfTheMatch || 0}</span>
        </div>
      ))}

      {/* EMPTY */}

      {players.length === 0 && (
        <div style={emptyWrap}>
          <p style={emptyTitle}>No misc stats</p>

          <p style={emptySub}>Completed matches will appear here</p>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const page = {
  display: "flex",

  flexDirection: "column",

  gap: 10,
};

const rowBase = {
  display: "grid",

  gridTemplateColumns: "2.6fr repeat(4,1fr)",

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

const mom = {
  textAlign: "center",

  fontWeight: 800,

  color: "#4338ca",
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
