import { useEffect, useState } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { Filter } from "lucide-react";

import { useSeasonStats } from "../context/SeasonStatsContext";
import { formatName } from "../utils/helpers";

import StatsFilterSheet from "../components/stats/StatsFilterSheet";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";

import { api } from "../api";

export default function BattingStats({ isOverall = false }) {
  const { seasonId } = useParams();
  const navigate = useNavigate();

  // Attempt to get globalFilter from InsightsHub outlet context
  const outletContext = useOutletContext();
  const globalFilter = isOverall ? outletContext?.globalFilter || "all" : null;

  const context = useSeasonStats();

  /* ---------------- CONTEXT ---------------- */

  const battingStats = !isOverall ? context?.battingStats : null;

  const setBattingStats = !isOverall ? context?.setBattingStats : null;

  /* ---------------- LOCAL STATE ---------------- */

  const [players, setPlayers] = useState([]);

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

      // NOTE: team/opponent filters below are still team *names* in the UI,
      // but StatsController expects teamId/opponentTeamId. There's no
      // name->id lookup available from here yet, so those two filters are
      // sent through as-is and won't actually narrow results on the backend
      // until that lookup exists.
      const json = await api.stats.getBattingLeaderboard({
        seasonId: isOverall ? (globalFilter !== "all" ? globalFilter : undefined) : seasonId,
        inningsNumber: { First: 1, Second: 2 }[selectedFilters.innings],
        result: { Won: "WIN", Lost: "LOSS" }[selectedFilters.result],
        battingPosition:
          selectedFilters.position === "Opening" ? 1 : Number(selectedFilters.position) || undefined,
        teamId: selectedFilters.team,
        opponentTeamId: selectedFilters.opponent,
      });

      setPlayers(json || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      // NOTE: TeamController has no "list all teams" endpoint - reusing
      // team search with an empty query as a best-effort stand-in until one
      // exists (see api/teams.js).
      const json = await api.teams.searchTeams("");
      const teams = (json || []).map((team) => team.teamName);

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
        av = a.inningsPlayed || 0;
        bv = b.inningsPlayed || 0;
        break;

      case "runs":
        av = a.totalRuns || 0;
        bv = b.totalRuns || 0;
        break;

      case "hs":
        av = a.highestScore || 0;
        bv = b.highestScore || 0;
        break;

      case "sr":
        av = Number(a.strikeRate || 0);

        bv = Number(b.strikeRate || 0);

        break;

      case "avg":
        av = Number(a.average || 0);

        bv = Number(b.average || 0);

        break;

      case "fours":
        av = a.totalFours || 0;
        bv = b.totalFours || 0;
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
    return <LoadingState label="Loading batting stats..." />;
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
          key={p.playerId}
          style={{
            ...rowBase,
            ...dataRow,
          }}
        >
          <span
            style={{ ...playerCell, cursor: "pointer", color: "var(--color-indigo-600)" }}
            onClick={() => navigate(`/player/${encodeURIComponent(p.playerId)}`)}
          >
            {formatName(p.playerName)}
          </span>

          <span style={center}>{p.inningsPlayed || 0}</span>

          <span style={runs}>{p.totalRuns || 0}</span>

          <span style={hs}>{p.highestScore || 0}</span>

          <span style={sr}>{p.strikeRate?.toFixed(2) || "0.00"}</span>

          <span style={center}>{p.totalFours || 0}</span>

          <span style={center}>{p.ducks || 0}</span>
        </div>
      ))}

      {/* EMPTY */}

      {players.length === 0 && (
        <EmptyState title="No batting stats" subtitle="Completed matches will appear here" />
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
  color: "var(--color-gray-900)",
  marginBottom: 10,
};

const filterBtn = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  border: "none",
  background: "linear-gradient(135deg,var(--color-indigo-600),var(--color-indigo-700))",
  color: "var(--color-white)",
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
  background: "var(--color-indigo-50)",
  color: "var(--color-indigo-700)",
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

  color: "var(--color-slate-500)",
};

const dataRow = {
  background: "var(--color-white)",

  padding: "14px",

  borderRadius: 18,

  boxShadow: "0 2px 10px rgba(15,23,42,0.05)",

  border: "1px solid var(--color-indigo-50)",

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

  color: "var(--color-gray-900)",

  textAlign: "left",

  fontSize: 14,
};

const center = {
  textAlign: "center",

  fontWeight: 600,

  color: "var(--color-gray-700)",
};

const runs = {
  textAlign: "center",

  fontWeight: 800,

  color: "var(--color-indigo-700)",
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