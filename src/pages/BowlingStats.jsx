import { useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";

import { api } from "../api";
import EmptyState from "../components/common/EmptyState";
import LoadingState from "../components/common/LoadingState";
import StatsFilterSheet from "../components/stats/StatsFilterSheet";
import { useLeaderboardTeams } from "../hooks/useLeaderboardTeams";
import { formatName } from "../utils/helpers";

import styles from "./LeaderboardStats.module.css";

const DEFAULT_FILTERS = Object.freeze({
  innings: "All",
  result: "All",
  opponentTeamId: "All",
  teamId: "All",
});

const INNINGS_NUMBER = Object.freeze({ First: 1, Second: 2 });
const MATCH_RESULT = Object.freeze({ Won: "WIN", Lost: "LOSS" });

function optionalFilter(value) {
  return value && value !== "All" ? value : undefined;
}

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function oversToBalls(value) {
  if (value === null || value === undefined || value === "") return 0;

  const [overs = "0", balls = "0"] = String(value).split(".");
  return numericValue(overs) * 6 + numericValue(balls);
}

function getOptionLabel(filters, key, value) {
  const filter = filters.find((item) => item.key === key);
  const option = filter?.options?.find((item) =>
    typeof item === "string" ? item === value : item.value === value,
  );

  if (!option) return value;
  return typeof option === "string" ? option : option.label;
}

function SortHeader({ label, column, sortKey, sortDirection, onSort }) {
  const isActive = sortKey === column;

  return (
    <button
      type="button"
      className={styles.sortButton}
      onClick={() => onSort(column)}
      aria-label={`Sort by ${label}`}
      aria-pressed={isActive}
    >
      {label}
      {isActive && (
        <span className={styles.sortIndicator}>
          {sortDirection === "asc" ? "▲" : "▼"}
        </span>
      )}
    </button>
  );
}

export default function BowlingStats({ isOverall = false }) {
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext();

  const globalFilter = isOverall ? outletContext?.globalFilter || "all" : "all";

  const statsSeasonId = useMemo(() => {
    if (!isOverall) return seasonId;
    return globalFilter !== "all" ? globalFilter : undefined;
  }, [globalFilter, isOverall, seasonId]);

  const { teamOptions, loadingTeams, teamError } = useLeaderboardTeams({
    seasonId,
    isOverall,
    globalFilter,
  });

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sortKey, setSortKey] = useState("wickets");
  const [sortDirection, setSortDirection] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState(DEFAULT_FILTERS);

  const filters = useMemo(
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
        options: [{ value: "All", label: "All" }, ...teamOptions],
      },
      {
        key: "teamId",
        label: "Team",
        options: [{ value: "All", label: "All" }, ...teamOptions],
      },
    ],
    [teamOptions],
  );

  useEffect(() => {
    let isCurrentRequest = true;

    async function loadStats() {
      try {
        setLoading(true);
        setLoadError("");

        const response = await api.stats.getBowlingLeaderboard({
          seasonId: statsSeasonId,
          inningsNumber: INNINGS_NUMBER[selectedFilters.innings],
          result: MATCH_RESULT[selectedFilters.result],
          teamId: optionalFilter(selectedFilters.teamId),
          opponentTeamId: optionalFilter(selectedFilters.opponentTeamId),
        });

        if (!isCurrentRequest) return;

        const rows = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        setPlayers(rows);
      } catch (error) {
        if (!isCurrentRequest) return;

        console.error("Failed to load bowling leaderboard:", error);
        setPlayers([]);
        setLoadError("Unable to load bowling statistics.");
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    }

    loadStats();

    return () => {
      isCurrentRequest = false;
    };
  }, [selectedFilters, statsSeasonId]);

  const sortedPlayers = useMemo(() => {
    const valueFor = (player) => {
      switch (sortKey) {
        case "innings":
          return numericValue(player.inningsBowled);
        case "wickets":
          return numericValue(player.totalWickets);
        case "overs":
          return player.totalBallsBowled != null
            ? numericValue(player.totalBallsBowled)
            : oversToBalls(player.totalOversBowled);
        case "economy":
          return numericValue(player.economyRate);
        case "average":
          return numericValue(player.average);
        case "fiveWicketHauls":
          return numericValue(player.fiveWicketHauls);
        default:
          return 0;
      }
    };

    return [...players].sort((left, right) => {
      const difference = valueFor(left) - valueFor(right);
      return sortDirection === "asc" ? difference : -difference;
    });
  }, [players, sortDirection, sortKey]);

  const activeFilters = useMemo(
    () =>
      Object.entries(selectedFilters)
        .filter(([, value]) => value !== "All")
        .map(([key, value]) => ({
          key,
          label: getOptionLabel(filters, key, value),
        })),
    [filters, selectedFilters],
  );

  const handleSort = (column) => {
    if (sortKey === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(column);
    setSortDirection("desc");
  };

  if (loading && players.length === 0) {
    return <LoadingState label="Loading bowling stats..." />;
  }

  return (
    <section className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.activeFilters}>
          {activeFilters.map((filter) => (
            <span key={filter.key} className={styles.filterPill}>
              {filter.label}
            </span>
          ))}

          {teamError && (
            <span className={styles.filterWarning}>
              Team filters unavailable
            </span>
          )}
        </div>

        <button
          type="button"
          className={styles.filterButton}
          onClick={() => setShowFilters(true)}
          aria-label="Open bowling filters"
          disabled={loadingTeams}
        >
          <Filter size={18} />
        </button>
      </div>

      <div className={styles.tableViewport}>
        <div
          className={`${styles.gridRow} ${styles.bowlingGrid} ${styles.headerRow}`}
        >
          <span className={styles.playerHeader}>Player</span>
          <SortHeader
            label="I"
            column="innings"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <SortHeader
            label="W"
            column="wickets"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <SortHeader
            label="O"
            column="overs"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <SortHeader
            label="Eco"
            column="economy"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <SortHeader
            label="Avg"
            column="average"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <SortHeader
            label="5W"
            column="fiveWicketHauls"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>

        {sortedPlayers.map((player) => (
          <div
            key={player.playerId ?? player.playerName}
            className={`${styles.gridRow} ${styles.bowlingGrid} ${styles.dataRow}`}
          >
            <button
              type="button"
              className={styles.playerButton}
              onClick={() =>
                navigate(`/player/${encodeURIComponent(player.playerId)}`)
              }
            >
              {formatName(player.playerName)}
            </button>

            <span className={styles.center}>
              {numericValue(player.inningsBowled)}
            </span>
            <span className={styles.wickets}>
              {numericValue(player.totalWickets)}
            </span>
            <span className={styles.center}>
              {player.totalOversBowled ?? "0.0"}
            </span>
            <span className={styles.economy}>
              {numericValue(player.economyRate).toFixed(2)}
            </span>
            <span className={styles.average}>
              {numericValue(player.average).toFixed(2)}
            </span>
            <span className={styles.best}>
              {numericValue(player.fiveWicketHauls)}
            </span>
          </div>
        ))}
      </div>

      {!loading && players.length === 0 && (
        <EmptyState
          title={
            loadError ? "Unable to load bowling stats" : "No bowling stats"
          }
          subtitle={
            loadError ||
            "Completed matches matching these filters will appear here."
          }
        />
      )}

      <StatsFilterSheet
        open={showFilters}
        title="Bowling filters"
        onClose={() => setShowFilters(false)}
        filters={filters}
        selectedFilters={selectedFilters}
        onChange={setSelectedFilters}
      />
    </section>
  );
}
