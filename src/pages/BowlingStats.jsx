import { useEffect, useState } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { formatName } from "../utils/helpers";

import { Filter } from "lucide-react";

import StatsFilterSheet from "../components/stats/StatsFilterSheet";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";

import { api } from "../api";

export default function BowlingStats({ isOverall = false }) {
  const { seasonId } = useParams();
  const navigate = useNavigate();

  const outletContext = useOutletContext();
  const globalFilter = isOverall ? outletContext?.globalFilter || "all" : null;

  /* =====================================
     OVERALL LOCAL STATE
  ===================================== */

  const [players, setPlayers] = useState([]);

  const [loading, setLoading] = useState(false);

  const [sortKey, setSortKey] = useState("wickets");

  const [sortDir, setSortDir] = useState("desc");

  const [selectedFilters, setSelectedFilters] = useState({
    innings: "All",
    result: "All",
    opponent: "All",
    team: "All",
  });

  /* =====================================
     LOAD ONLY ONCE
  ===================================== */

  useEffect(() => {
    loadStats();
  }, [seasonId, isOverall, globalFilter, selectedFilters]);

  useEffect(() => {
    loadFilterOptions();
  }, [seasonId, isOverall]);

  /* =====================================
     FETCH
  ===================================== */

  const loadStats = async () => {
    try {
      setLoading(true);

      // NOTE: team/opponent filters are still team *names* here, but
      // StatsController expects teamId/opponentTeamId - see the matching
      // note in BattingStats.jsx.
      const json = await api.stats.getBowlingLeaderboard({
        seasonId: isOverall
          ? globalFilter !== "all"
            ? globalFilter
            : undefined
          : seasonId,
        inningsNumber: { First: 1, Second: 2 }[selectedFilters.innings],
        result: { Won: "WIN", Lost: "LOSS" }[selectedFilters.result],
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

  const [showFilters, setShowFilters] = useState(false);

  const [filterOptions, setFilterOptions] = useState({
    teams: [],
    opponents: [],
  });

  const bowlingFilters = [
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

  /* =====================================
     SORT
  ===================================== */

  const sortedPlayers = [...players].sort((a, b) => {
    let av = 0;
    let bv = 0;

    switch (sortKey) {
      case "five":
        av = a.fiveWicketHauls || 0;
        bv = b.fiveWicketHauls || 0;
        break;

      case "innings":
        av = a.inningsBowled || 0;
        bv = b.inningsBowled || 0;
        break;

      case "wickets":
        av = a.totalWickets || 0;
        bv = b.totalWickets || 0;
        break;

      case "balls":
        av = a.totalOversBowled || 0;
        bv = b.totalOversBowled || 0;
        break;

      case "eco":
        av = Number(a.economyRate || 0);

        bv = Number(b.economyRate || 0);

        break;

      case "avg":
        av = Number(a.average || 0);

        bv = Number(b.average || 0);

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
    return <LoadingState label="Loading bowling stats..." />;
  }

  /* =====================================
     UI
  ===================================== */

  return (
    <div style={page}>
      <div style={topBar}>
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

        <SortHeader label="W" col="wickets" />

        <SortHeader label="O" col="balls" />

        <SortHeader label="Eco" col="eco" />

        <SortHeader label="Avg" col="avg" />

        <SortHeader label="5W" col="five" />
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
            onClick={() =>
              navigate(`/player/${encodeURIComponent(p.playerId)}`)
            }
          >
            {formatName(p.playerName)}
          </span>

          <span style={center}>{p.inningsBowled || 0}</span>

          <span style={wickets}>{p.totalWickets || 0}</span>

          <span style={center}>{p.totalOversBowled || 0}</span>

          <span style={eco}>{p.economyRate?.toFixed(2) || "0.00"}</span>

          <span style={avg}>{p.average?.toFixed(2) || "0.00"}</span>

          <span style={best}>{p.fiveWicketHauls || 0}</span>
        </div>
      ))}

      {/* EMPTY */}

      {players.length === 0 && (
        <EmptyState
          title="No bowling stats"
          subtitle="Completed matches will appear here"
        />
      )}
      <StatsFilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={bowlingFilters}
        selectedFilters={selectedFilters}
        onChange={setSelectedFilters}
      />
    </div>
  );
}

/* =========================================
   STYLES
========================================= */
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

const wickets = {
  textAlign: "center",

  fontWeight: 800,

  color: "var(--color-red-600)",
};

const eco = {
  textAlign: "center",

  fontWeight: 700,

  color: "#2563eb",
};

const avg = {
  textAlign: "center",

  fontWeight: 700,

  color: "var(--color-emerald-600)",
};

const best = {
  textAlign: "center",

  fontWeight: 800,

  color: "var(--color-violet-600)",
};
