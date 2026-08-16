import { useMemo, useState, useEffect } from "react";
import { Filter } from "lucide-react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";

import EmptyState from "../components/common/EmptyState";
import LoadingState from "../components/common/LoadingState";
import StatsFilterSheet from "../components/stats/StatsFilterSheet";
import { formatName } from "../utils/helpers";
import { useBowlingLeaderboard, useTeamsForSeason } from "../hooks/queries";

const DEFAULT_FILTERS = {
  innings: "All",
  result: "All",
  opponentTeamId: "All",
  teamId: "All",
};

const INNINGS_NUMBER = {
  First: 1,
  Second: 2,
};

const MATCH_RESULT = {
  Won: "WIN",
  Lost: "LOSS",
};

const getOptionalFilter = (value) =>
  value && value !== "All" ? value : undefined;

const getNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const oversToBalls = (oversValue) => {
  if (oversValue === null || oversValue === undefined || oversValue === "") {
    return 0;
  }

  const [overs = "0", balls = "0"] = String(oversValue).split(".");

  return getNumber(overs) * 6 + getNumber(balls);
};

export default function BowlingStats({ isOverall = false }) {
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext();

  const globalFilter = isOverall ? outletContext?.globalFilter || "all" : "all";

  const statsSeasonId = useMemo(() => {
    if (!isOverall) {
      return seasonId;
    }

    return globalFilter !== "all" ? globalFilter : undefined;
  }, [globalFilter, isOverall, seasonId]);

  const teamsSeasonId = useMemo(() => {
    if (!isOverall) {
      return seasonId || "ALL";
    }

    return globalFilter !== "all" ? globalFilter : "ALL";
  }, [globalFilter, isOverall, seasonId]);

  const [sortKey, setSortKey] = useState("wickets");
  const [sortDir, setSortDir] = useState("desc");

  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState(DEFAULT_FILTERS);

  /*
   * Reset team-related filters whenever the selected season changes.
   */
  useEffect(() => {
    setSelectedFilters((currentFilters) => {
      if (
        currentFilters.teamId === "All" &&
        currentFilters.opponentTeamId === "All"
      ) {
        return currentFilters;
      }

      return {
        ...currentFilters,
        teamId: "All",
        opponentTeamId: "All",
      };
    });
  }, [teamsSeasonId]);

  const {
    data: rawTeams = [],
    isLoading: loadingTeams,
    isError: teamsErrored,
  } = useTeamsForSeason(teamsSeasonId);

  const teams = useMemo(() => {
    const uniqueTeams = new Map();

    rawTeams.forEach((team) => {
      const teamId = team.teamId ?? team.id;
      const teamName = team.teamName ?? team.name;

      if (!teamId || !teamName || uniqueTeams.has(teamId)) {
        return;
      }

      uniqueTeams.set(teamId, {
        value: teamId,
        label: formatName(teamName),
      });
    });

    return [...uniqueTeams.values()].sort((firstTeam, secondTeam) =>
      firstTeam.label.localeCompare(secondTeam.label),
    );
  }, [rawTeams]);

  const teamsError = teamsErrored ? "Unable to load team filters." : "";

  const {
    data: players = [],
    isLoading: loading,
    isError: statsErrored,
  } = useBowlingLeaderboard({
    seasonId: statsSeasonId,
    inningsNumber: INNINGS_NUMBER[selectedFilters.innings],
    result: MATCH_RESULT[selectedFilters.result],
    teamId: getOptionalFilter(selectedFilters.teamId),
    opponentTeamId: getOptionalFilter(selectedFilters.opponentTeamId),
  });

  const statsError = statsErrored ? "Unable to load bowling statistics." : "";

  const bowlingFilters = useMemo(
    () => [
      {
        key: "innings",
        label: "Innings",
        options: [
          { value: "All", label: "All" },
          { value: "First", label: "First" },
          { value: "Second", label: "Second" },
        ],
      },
      {
        key: "result",
        label: "Match Result",
        options: [
          { value: "All", label: "All" },
          { value: "Won", label: "Won" },
          { value: "Lost", label: "Lost" },
        ],
      },
      {
        key: "opponentTeamId",
        label: "Opponent",
        options: [{ value: "All", label: "All" }, ...teams],
      },
      {
        key: "teamId",
        label: "Team",
        options: [{ value: "All", label: "All" }, ...teams],
      },
    ],
    [teams],
  );

  const getFilterLabel = (filterKey, filterValue) => {
    const filter = bowlingFilters.find((item) => item.key === filterKey);

    const option = filter?.options.find((item) => item.value === filterValue);

    return option?.label || filterValue;
  };

  const sortedPlayers = useMemo(() => {
    const getSortValue = (player) => {
      switch (sortKey) {
        case "innings":
          return getNumber(player.inningsBowled);

        case "wickets":
          return getNumber(player.totalWickets);

        case "overs":
          return player.totalBallsBowled !== undefined &&
            player.totalBallsBowled !== null
            ? getNumber(player.totalBallsBowled)
            : oversToBalls(player.totalOversBowled);

        case "economy":
          return getNumber(player.economyRate);

        case "average":
          return getNumber(player.average);

        case "fiveWicketHauls":
          return getNumber(player.fiveWicketHauls);

        default:
          return 0;
      }
    };

    return [...players].sort((firstPlayer, secondPlayer) => {
      const difference = getSortValue(firstPlayer) - getSortValue(secondPlayer);

      return sortDir === "asc" ? difference : -difference;
    });
  }, [players, sortDir, sortKey]);

  const handleSort = (column) => {
    if (sortKey === column) {
      setSortDir((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortKey(column);
    setSortDir("desc");
  };

  const SortHeader = ({ label, column }) => {
    const active = sortKey === column;

    return (
      <button
        type="button"
        style={sortableHeader}
        onClick={() => handleSort(column)}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {active && (sortDir === "asc" ? " ▲" : " ▼")}
      </button>
    );
  };

  if (loading && players.length === 0) {
    return <LoadingState label="Loading bowling stats..." />;
  }

  return (
    <div style={page}>
      <div style={topBar}>
        <div style={activeFilters}>
          {Object.entries(selectedFilters).map(([key, value]) => {
            if (value === "All") {
              return null;
            }

            return (
              <span key={key} style={filterPill}>
                {getFilterLabel(key, value)}
              </span>
            );
          })}

          {teamsError && <span style={warningPill}>{teamsError}</span>}
        </div>

        <button
          type="button"
          style={{
            ...filterBtn,
            opacity: loadingTeams ? 0.6 : 1,
          }}
          onClick={() => setShowFilters(true)}
          disabled={loadingTeams}
          aria-label="Open bowling filters"
        >
          <Filter size={18} />
        </button>
      </div>

      <div
        style={{
          ...rowBase,
          ...headerRow,
        }}
      >
        <span style={playerHeader}>Player</span>
        <SortHeader label="I" column="innings" />
        <SortHeader label="W" column="wickets" />
        <SortHeader label="O" column="overs" />
        <SortHeader label="Eco" column="economy" />
        <SortHeader label="Avg" column="average" />
        <SortHeader label="5W" column="fiveWicketHauls" />
      </div>

      {sortedPlayers.map((player) => (
        <div
          key={player.playerId ?? player.playerName}
          style={{
            ...rowBase,
            ...dataRow,
          }}
        >
          <button
            type="button"
            style={playerCell}
            onClick={() =>
              navigate(`/player/${encodeURIComponent(player.playerId)}`)
            }
          >
            {formatName(player.playerName)}
          </button>

          <span style={center}>{getNumber(player.inningsBowled)}</span>

          <span style={wickets}>{getNumber(player.totalWickets)}</span>

          <span style={center}>{player.totalOversBowled ?? "0.0"}</span>

          <span style={eco}>{getNumber(player.economyRate).toFixed(2)}</span>

          <span style={avg}>{getNumber(player.average).toFixed(2)}</span>

          <span style={best}>{getNumber(player.fiveWicketHauls)}</span>
        </div>
      ))}

      {!loading && players.length === 0 && (
        <EmptyState
          title={
            statsError ? "Unable to load bowling stats" : "No bowling stats"
          }
          subtitle={
            statsError ||
            "Completed matches matching these filters will appear here."
          }
        />
      )}

      <StatsFilterSheet
        open={showFilters}
        title="Bowling filters"
        onClose={() => setShowFilters(false)}
        filters={bowlingFilters}
        selectedFilters={selectedFilters}
        onChange={setSelectedFilters}
      />
    </div>
  );
}

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  minHeight: 42,
  marginBottom: 14,
};

const filterBtn = {
  width: 42,
  height: 42,
  flexShrink: 0,
  borderRadius: "50%",
  border: "none",
  background:
    "linear-gradient(135deg,var(--color-indigo-600),var(--color-indigo-700))",
  color: "var(--color-white)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(79,70,229,0.25)",
};

const activeFilters = {
  display: "flex",
  flex: 1,
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

const warningPill = {
  ...filterPill,
  background: "#fff7ed",
  color: "#c2410c",
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
  padding: 14,
  borderRadius: 18,
  boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
  border: "1px solid var(--color-indigo-50)",
  fontSize: 14,
};

const sortableHeader = {
  border: "none",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  textAlign: "center",
  cursor: "pointer",
  userSelect: "none",
};

const playerHeader = {
  textAlign: "left",
};

const playerCell = {
  minWidth: 0,
  padding: 0,
  border: "none",
  background: "transparent",
  fontWeight: 700,
  color: "var(--color-indigo-600)",
  textAlign: "left",
  fontSize: 14,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  cursor: "pointer",
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
