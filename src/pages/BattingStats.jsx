import { useEffect, useState } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { Filter } from "lucide-react";

import { useSeasonStats } from "../context/SeasonStatsContext";
import { formatName } from "../utils/helpers";

import StatsFilterSheet from "../components/stats/StatsFilterSheet";

import { buildBattingEndpoint } from "../utils/buildBattingEndpoint";

export default function BattingStats({ isOverall = false }) {
  const { seasonId } = useParams();
  const navigate = useNavigate();

  // Attempt to get globalFilter from InsightsHub outlet context
  const outletContext = useOutletContext();
  const globalFilter = isOverall ? outletContext?.globalFilter || "all" : null;

  const API = import.meta.env.VITE_API_BASE_URL;

  const context = useSeasonStats();

  /* ---------------- CONTEXT ---------------- */

  const battingStats = !isOverall ? context?.battingStats : null;

  const setBattingStats = !isOverall ? context?.setBattingStats : null;

  /* ---------------- LOCAL STATE ---------------- */

  const [overallStats, setOverallStats] = useState(null);

  const [players, setPlayers] = useState([]);

  // const players = isOverall ? overallStats || [] : battingStats || [];

  const [loading, setLoading] = useState(false);

  const [sortKey, setSortKey] = useState("runs");

  const [sortDir, setSortDir] = useState("desc");

  const [showFilters, setShowFilters] = useState(false);

  const [selectedFilters, setSelectedFilters] = useState({
    innings: "All",
    result: "All",
    position: "All",
    opponent: "All",
    team: "All",
  });

  const [filterOptions, setFilterOptions] = useState({
    teams: [],
    opponents: [],
  });

  /* ---------------- LOAD ONLY ONCE ---------------- */

  useEffect(() => {
    loadStats();
  }, [seasonId, isOverall, globalFilter, selectedFilters]);

  useEffect(() => {
    loadFilterOptions();
  }, [seasonId, isOverall]);

  /* ---------------- FETCH ---------------- */

  const loadStats = async () => {
    try {
      setLoading(true);

      const endpoint = buildBattingEndpoint({
        API,
        isOverall,
        globalFilter,
        seasonId,
        filters: selectedFilters,
      });

      const res = await fetch(endpoint);

      const json = await res.json();

      setPlayers(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
  try {
    let endpoint;

    if (isOverall) {
      endpoint = `${API}/api/teams`;
    } else {
      endpoint = `${API}/api/teams/season/${seasonId}`;
    }

    const res = await fetch(endpoint);

    const json = await res.json();

    const teams =
      json.data?.map((team) => team.name) || [];

    setFilterOptions({
      teams,
      opponents: teams,
    });
  } catch (err) {
    console.error(err);
  }
};

  /* ---------------- SORT ---------------- */

  const sortedPlayers = [...players].sort((a, b) => {
    let av = 0;
    let bv = 0;

    switch (sortKey) {
      case "innings":
        av = a.innings || 0;
        bv = b.innings || 0;
        break;

      case "runs":
        av = a.runs || 0;
        bv = b.runs || 0;
        break;

      case "hs":
        av = a.highestScore || 0;
        bv = b.highestScore || 0;
        break;

      case "sr":
        av = Number(a.derived?.strikeRate || 0);

        bv = Number(b.derived?.strikeRate || 0);

        break;

      case "avg":
        av = Number(a.derived?.battingAverage || 0);

        bv = Number(b.derived?.battingAverage || 0);

        break;

      case "fours":
        av = a.fours || 0;
        bv = b.fours || 0;
        break;

      case "ducks":
        av = a.ducks || 0;
        bv = b.ducks || 0;
        break;

      default:
        av = 0;
        bv = 0;
    }

    return sortDir === "asc" ? av - bv : bv - av;
  });

  /* ---------------- SORT HEADER ---------------- */

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

  /* ---------------- LOADING ---------------- */

  if (loading && players.length === 0) {
    return (
      <div style={loadingWrap}>
        <div style={spinner}></div>

        <p style={loadingText}>Loading batting stats...</p>
      </div>
    );
  }

  const battingFilters = [
    {
      key: "innings",
      label: "Innings",
      options: ["All", "First", "Second"],
    },

    {
      key: "result",
      label: "Match Result",
      options: ["All", "Won", "Lost"],
    },

    {
      key: "position",
      label: "Batting Position",
      options: [
        "All",
        "Opening",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
      ],
    },

    {
      key: "opponent",
      label: "Opponent",
      options: ["All", ...filterOptions.opponents],
    },

    {
      key: "team",
      label: "Team",
      options: ["All", ...filterOptions.teams],
    },
  ];

  /* ---------------- UI ---------------- */

  return (
    <div style={page}>
      <div style={topBar}>
        <div>
          <div style={activeFilters}>
            {Object.entries(selectedFilters).map(([key, value]) => {
              if (value === "All") return null;

              return (
                <span key={key} style={filterPill}>
                  {value}
                </span>
              );
            })}
          </div>
        </div>

        <button style={filterBtn} onClick={() => setShowFilters(true)}>
          <Filter size={18} />
        </button>
      </div>
      {/* HEADER */}

      <div
        style={{
          ...rowBase,
          ...headerRow,
        }}
      >
        <span style={playerHeader}>Player</span>

        <SortHeader label="I" col="innings" />

        <SortHeader label="R" col="runs" />

        <SortHeader label="HS" col="hs" />

        <SortHeader label="SR" col="sr" />

        <SortHeader label="4s" col="fours" />

        <SortHeader label="0s" col="ducks" />
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

          <span style={runs}>{p.runs || 0}</span>

          <span style={hs}>{p.highestScore || 0}</span>

          <span style={sr}>{p.derived?.strikeRate || "0.00"}</span>

          <span style={center}>{p.fours || 0}</span>

          <span style={center}>{p.ducks || 0}</span>
        </div>
      ))}

      {/* EMPTY */}

      {players.length === 0 && (
        <div style={emptyWrap}>
          <p style={emptyTitle}>No batting stats</p>

          <p style={emptySub}>Completed matches will appear here</p>
        </div>
      )}

      <StatsFilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={battingFilters}
        selectedFilters={selectedFilters}
        onChange={setSelectedFilters}
      />
    </div>
  );
}

/* ================= STYLES ================= */

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 14,
};

const statsTitle = {
  fontSize: 22,
  fontWeight: 800,
  color: "#111827",
  marginBottom: 10,
};

const filterBtn = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  border: "none",
  background: "linear-gradient(135deg,#4f46e5,#4338ca)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(79,70,229,0.25)",
};

const activeFilters = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const filterPill = {
  padding: "6px 12px",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#4338ca",
  fontSize: 12,
  fontWeight: 700,
};

const page = {
  display: "flex",

  flexDirection: "column",

  gap: 10,
};

const rowBase = {
  display: "grid",

  gridTemplateColumns: "2.6fr repeat(6,1fr)",

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

const runs = {
  textAlign: "center",

  fontWeight: 800,

  color: "#4338ca",
};

const hs = {
  textAlign: "center",

  fontWeight: 800,

  color: "#ea580c",
};

const sr = {
  textAlign: "center",

  fontWeight: 700,

  color: "#1d4ed8",
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
