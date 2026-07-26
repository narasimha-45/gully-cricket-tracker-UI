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
  position: "All",
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

export default function BattingStats({ isOverall = false }) {
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
  const [sortKey, setSortKey] = useState("runs");
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
        key: "position",
        label: "Batting Position",
        options: [
          { value: "All", label: "All" },
          { value: "Opening", label: "Opening" },
          ...Array.from({ length: 9 }, (_, index) => {
            const value = String(index + 3);
            return { value, label: value };
          }),
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

        const battingPosition =
          selectedFilters.position === "Opening"
            ? 1
            : optionalFilter(selectedFilters.position)
              ? Number(selectedFilters.position)
              : undefined;

        const response = await api.stats.getBattingLeaderboard({
          seasonId: statsSeasonId,
          inningsNumber: INNINGS_NUMBER[selectedFilters.innings],
          result: MATCH_RESULT[selectedFilters.result],
          battingPosition,
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

        console.error("Failed to load batting leaderboard:", error);
        setPlayers([]);
        setLoadError("Unable to load batting statistics.");
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
          return numericValue(player.inningsPlayed);
        case "runs":
          return numericValue(player.totalRuns);
        case "highestScore":
          return numericValue(player.highestScore);
        case "strikeRate":
          return numericValue(player.strikeRate);
        case "average":
          return numericValue(player.average);
        case "fours":
          return numericValue(player.totalFours);
        case "ducks":
          return numericValue(player.ducks);
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
    return <LoadingState label="Loading batting stats..." />;
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
          aria-label="Open batting filters"
          disabled={loadingTeams}
        >
          <Filter size={18} />
        </button>
      </div>

      <div className={styles.tableViewport}>
        <div
          className={`${styles.gridRow} ${styles.battingGrid} ${styles.headerRow}`}
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
            label="R"
            column="runs"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <SortHeader
            label="HS"
            column="highestScore"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <SortHeader
            label="SR"
            column="strikeRate"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <SortHeader
            label="4s"
            column="fours"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <SortHeader
            label="0s"
            column="ducks"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>

        {sortedPlayers.map((player) => (
          <div
            key={player.playerId ?? player.playerName}
            className={`${styles.gridRow} ${styles.battingGrid} ${styles.dataRow}`}
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
              {numericValue(player.inningsPlayed)}
            </span>
            <span className={styles.runs}>
              {numericValue(player.totalRuns)}
            </span>
            <span className={styles.highestScore}>
              {numericValue(player.highestScore)}
            </span>
            <span className={styles.strikeRate}>
              {numericValue(player.strikeRate).toFixed(2)}
            </span>
            <span className={styles.center}>
              {numericValue(player.totalFours)}
            </span>
            <span className={styles.center}>{numericValue(player.ducks)}</span>
          </div>
        ))}
      </div>

      {!loading && players.length === 0 && (
        <EmptyState
          title={
            loadError ? "Unable to load batting stats" : "No batting stats"
          }
          subtitle={
            loadError ||
            "Completed matches matching these filters will appear here."
          }
        />
      )}

      <StatsFilterSheet
        open={showFilters}
        title="Batting filters"
        onClose={() => setShowFilters(false)}
        filters={filters}
        selectedFilters={selectedFilters}
        onChange={setSelectedFilters}
      />
    </section>
  );
}
