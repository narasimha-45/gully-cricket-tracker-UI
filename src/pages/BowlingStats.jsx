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
import { useBowlingLeaderboard, useTeamsForSeason } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./Leaderboards.module.css";

const DEFAULT_FILTERS = Object.freeze({ innings: "All", result: "All", opponentTeamId: "All", teamId: "All" });
const INNINGS_NUMBER = { First: 1, Second: 2 };
const MATCH_RESULT = { Won: "WIN", Lost: "LOSS" };
const optional = (value) => (value && value !== "All" ? value : undefined);
const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const formatOvers = (value) => {
  if (value === null || value === undefined) return "0.0";
  const text = String(value);
  return text.includes(".") ? text : `${text}.0`;
};

export default function BowlingStats({ isOverall = false }) {
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const globalFilter = isOverall ? outletContext?.globalFilter || "all" : "all";
  const statsSeasonId = !isOverall ? seasonId : globalFilter !== "all" ? globalFilter : undefined;
  const teamsSeasonId = !isOverall ? seasonId || "ALL" : globalFilter !== "all" ? globalFilter : "ALL";

  const [state, dispatch] = useReducer(
    leaderboardReducer,
    createLeaderboardState(DEFAULT_FILTERS, "wickets"),
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
      teamId: optional(state.filters.teamId),
      opponentTeamId: optional(state.filters.opponentTeamId),
    }),
    [statsSeasonId, state.filters],
  );

  const statsQuery = useBowlingLeaderboard(apiFilters);

  const filterDefinitions = useMemo(
    () => [
      { key: "innings", label: "Innings", options: ["All", "First", "Second"] },
      { key: "result", label: "Match Result", options: ["All", "Won", "Lost"] },
      { key: "opponentTeamId", label: "Opponent", options: [{ value: "All", label: "All" }, ...teams] },
      { key: "teamId", label: "Team", options: [{ value: "All", label: "All" }, ...teams] },
    ],
    [teams],
  );

  const activeLabels = useMemo(() => Object.entries(state.filters).flatMap(([key, value]) => {
    if (value === "All") return [];
    const definition = filterDefinitions.find((item) => item.key === key);
    const option = definition?.options.find((item) => (typeof item === "string" ? item : item.value) === value);
    return [typeof option === "string" ? option : option?.label || value];
  }), [filterDefinitions, state.filters]);

  const players = useMemo(() => {
    const getSortValue = (player) => {
      switch (state.sortKey) {
        case "innings": return number(player.inningsBowled);
        case "wickets": return number(player.totalWickets);
        case "overs": return number(player.totalOversBowled);
        case "economy": return number(player.economyRate);
        case "average": return number(player.totalWickets) === 0 || player.average == null ? Number.POSITIVE_INFINITY : number(player.average);
        case "fiveWicketHauls": return number(player.fiveWicketHauls);
        default: return 0;
      }
    };
    return [...(statsQuery.data || [])].sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);
      const delta = aValue - bValue;
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
        emptyTitle="No bowling stats"
        emptySubtitle="Complete a match or adjust the filters to see bowling leaders."
      >
        <div className={styles.table}>
          <div className={`${styles.header} ${styles.bowlingGrid}`}>
            <span className={styles.playerHeader}>Player</span>
            <SortButton label="I" column="innings" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by innings bowled" />
            <SortButton label="W" column="wickets" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by wickets" />
            <SortButton label="O" column="overs" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by overs" />
            <SortButton label="Eco" column="economy" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by economy" />
            <SortButton label="Avg" column="average" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by average" />
            <SortButton label="5W" column="fiveWicketHauls" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by five wicket hauls" />
          </div>

          {players.map((player) => (
            <div key={player.playerId ?? player.playerName} className={`${styles.row} ${styles.bowlingGrid}`}>
              <button type="button" className={styles.playerButton} onClick={() => navigate(`/player/${encodeURIComponent(player.playerId)}`)}>
                {formatName(player.playerName)}
                <span className={styles.secondary}>{number(player.totalMatchesPlayed)} matches</span>
              </button>
              <span className={styles.stat}>{number(player.inningsBowled)}</span>
              <span className={`${styles.stat} ${styles.primaryStat}`}>{number(player.totalWickets)}</span>
              <span className={styles.stat}>{formatOvers(player.totalOversBowled)}</span>
              <span className={styles.stat}>{number(player.economyRate).toFixed(2)}</span>
              <span className={styles.stat}>{number(player.totalWickets) === 0 || player.average == null ? "—" : number(player.average).toFixed(2)}</span>
              <span className={styles.stat}>{number(player.fiveWicketHauls)}</span>
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
        title="Bowling filters"
      />
    </div>
  );
}
