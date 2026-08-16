import { useEffect, useMemo, useReducer } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import StatsFilterSheet from "../components/stats/StatsFilterSheet";
import {
  LeaderboardState,
  LeaderboardToolbar,
  SortButton,
} from "../features/stats/components/LeaderboardView";
import {
  LEADERBOARD_ACTIONS,
  createLeaderboardState,
  leaderboardReducer,
} from "../features/stats/state/leaderboardReducer";
import { useBattingLeaderboard, useTeamsForSeason } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./Leaderboards.module.css";

const DEFAULT_FILTERS = Object.freeze({
  innings: "All",
  result: "All",
  position: "All",
  opponentTeamId: "All",
  teamId: "All",
});
const INNINGS_NUMBER = { First: 1, Second: 2 };
const MATCH_RESULT = { Won: "WIN", Lost: "LOSS" };
const optional = (value) => (value && value !== "All" ? value : undefined);
const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export default function BattingStats({ isOverall = false }) {
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const globalFilter = isOverall ? outletContext?.globalFilter || "all" : "all";

  const statsSeasonId = !isOverall
    ? seasonId
    : globalFilter !== "all"
      ? globalFilter
      : undefined;
  const teamsSeasonId = !isOverall
    ? seasonId || "ALL"
    : globalFilter !== "all"
      ? globalFilter
      : "ALL";

  const [state, dispatch] = useReducer(
    leaderboardReducer,
    createLeaderboardState(DEFAULT_FILTERS, "runs"),
  );

  useEffect(() => {
    dispatch({ type: LEADERBOARD_ACTIONS.RESET_TEAM_FILTERS });
  }, [teamsSeasonId]);

  const teamsQuery = useTeamsForSeason(teamsSeasonId);
  const teams = useMemo(() => {
    const unique = new Map();
    (teamsQuery.data || []).forEach((team) => {
      const id = team.teamId ?? team.id;
      const name = team.teamName ?? team.name;
      if (id && name && !unique.has(id)) unique.set(id, { value: id, label: formatName(name) });
    });
    return [...unique.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [teamsQuery.data]);

  const apiFilters = useMemo(
    () => ({
      seasonId: statsSeasonId,
      inningsNumber: INNINGS_NUMBER[state.filters.innings],
      result: MATCH_RESULT[state.filters.result],
      battingPosition: optional(state.filters.position)
        ? Number(state.filters.position)
        : undefined,
      teamId: optional(state.filters.teamId),
      opponentTeamId: optional(state.filters.opponentTeamId),
    }),
    [statsSeasonId, state.filters],
  );

  const statsQuery = useBattingLeaderboard(apiFilters);

  const filterDefinitions = useMemo(
    () => [
      { key: "innings", label: "Innings", options: ["All", "First", "Second"] },
      { key: "result", label: "Match Result", options: ["All", "Won", "Lost"] },
      {
        key: "position",
        label: "Batting Position",
        options: [
          { value: "All", label: "All" },
          ...Array.from({ length: 11 }, (_, index) => ({
            value: String(index + 1),
            label: index < 2 ? `${index + 1} · Opener` : String(index + 1),
          })),
        ],
      },
      { key: "opponentTeamId", label: "Opponent", options: [{ value: "All", label: "All" }, ...teams] },
      { key: "teamId", label: "Team", options: [{ value: "All", label: "All" }, ...teams] },
    ],
    [teams],
  );

  const activeLabels = useMemo(() => {
    return Object.entries(state.filters).flatMap(([key, value]) => {
      if (value === "All") return [];
      const definition = filterDefinitions.find((item) => item.key === key);
      const option = definition?.options.find((item) => (typeof item === "string" ? item : item.value) === value);
      return [typeof option === "string" ? option : option?.label || value];
    });
  }, [filterDefinitions, state.filters]);

  const players = useMemo(() => {
    const getSortValue = (player) => {
      switch (state.sortKey) {
        case "innings": return number(player.inningsPlayed);
        case "runs": return number(player.totalRuns);
        case "balls": return number(player.totalBallsFaced);
        case "average": return number(player.average);
        case "strikeRate": return number(player.strikeRate);
        case "highest": return number(player.highestScore);
        default: return 0;
      }
    };
    return [...(statsQuery.data || [])].sort((a, b) => {
      const delta = getSortValue(a) - getSortValue(b);
      return state.sortDir === "asc" ? delta : -delta;
    });
  }, [statsQuery.data, state.sortDir, state.sortKey]);

  const onSort = (column) => dispatch({ type: LEADERBOARD_ACTIONS.SORT, payload: column });

  return (
    <div className={styles.page}>
      <LeaderboardToolbar
        activeLabels={activeLabels}
        warning={teamsQuery.isError ? "Team filters unavailable" : ""}
        onOpenFilters={() => dispatch({ type: LEADERBOARD_ACTIONS.OPEN_FILTERS })}
        filtersDisabled={teamsQuery.isLoading}
      />

      <LeaderboardState
        loading={statsQuery.isLoading}
        fetching={statsQuery.isFetching && !statsQuery.isLoading}
        error={statsQuery.error}
        empty={players.length === 0}
        onRetry={statsQuery.refetch}
        emptyTitle="No batting stats"
        emptySubtitle="Complete a match or adjust the filters to see batting leaders."
      >
        <div className={styles.table}>
          <div className={`${styles.header} ${styles.battingGrid}`}>
            <span className={styles.playerHeader}>Player</span>
            <SortButton label="I" column="innings" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by innings" />
            <SortButton label="R" column="runs" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by runs" />
            <SortButton label="B" column="balls" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by balls faced" />
            <SortButton label="Avg" column="average" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} />
            <SortButton label="SR" column="strikeRate" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} />
            <SortButton label="HS" column="highest" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by highest score" />
          </div>

          {players.map((player) => (
            <div key={player.playerId ?? player.playerName} className={`${styles.row} ${styles.battingGrid}`}>
              <button type="button" className={styles.playerButton} onClick={() => navigate(`/player/${encodeURIComponent(player.playerId)}`)}>
                {formatName(player.playerName)}
                <span className={styles.secondary}>{number(player.totalMatchesPlayed)} matches</span>
              </button>
              <span className={styles.stat}>{number(player.inningsPlayed)}</span>
              <span className={`${styles.stat} ${styles.primaryStat}`}>{number(player.totalRuns)}</span>
              <span className={styles.stat}>{number(player.totalBallsFaced)}</span>
              <span className={styles.stat}>{number(player.average).toFixed(1)}</span>
              <span className={styles.stat}>{number(player.strikeRate).toFixed(1)}</span>
              <span className={styles.stat}>{number(player.highestScore)}</span>
            </div>
          ))}
        </div>
      </LeaderboardState>

      <StatsFilterSheet
        open={state.filtersOpen}
        onClose={() => dispatch({ type: LEADERBOARD_ACTIONS.CLOSE_FILTERS })}
        filters={filterDefinitions}
        selectedFilters={state.filters}
        onChange={(filters) => dispatch({ type: LEADERBOARD_ACTIONS.APPLY_FILTERS, payload: filters })}
        title="Batting filters"
      />
    </div>
  );
}
