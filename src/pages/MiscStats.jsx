import { useMemo, useReducer } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  LeaderboardState,
  SortButton,
} from "../features/stats/components/LeaderboardView";
import {
  LEADERBOARD_ACTIONS,
  createLeaderboardState,
  leaderboardReducer,
} from "../features/stats/state/leaderboardReducer";
import { useFieldingLeaderboard } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./MiscStats.module.css";

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export default function MiscStats() {
  const navigate = useNavigate();
  const { globalFilter = "all" } = useOutletContext() || {};
  const [state, dispatch] = useReducer(
    leaderboardReducer,
    createLeaderboardState({}, "manOfTheMatch"),
  );

  const query = useFieldingLeaderboard({
    seasonId: globalFilter !== "all" ? globalFilter : undefined,
  });

  const players = useMemo(() => {
    const getValue = (player) => {
      switch (state.sortKey) {
        case "catches": return number(player.totalCatches);
        case "stumpings": return number(player.totalStumpings);
        case "runOuts": return number(player.totalRunOuts);
        case "manOfTheMatch": return number(player.manOfTheMatchAwards);
        default: return 0;
      }
    };
    return [...(query.data || [])].sort((a, b) => {
      const delta = getValue(a) - getValue(b);
      return state.sortDir === "asc" ? delta : -delta;
    });
  }, [query.data, state.sortDir, state.sortKey]);

  const onSort = (column) => dispatch({ type: LEADERBOARD_ACTIONS.SORT, payload: column });

  return (
    <LeaderboardState
      loading={query.isLoading}
      fetching={query.isFetching && !query.isLoading}
      error={query.error}
      empty={players.length === 0}
      onRetry={query.refetch}
      emptyTitle="No fielding stats"
      emptySubtitle="Catches, run-outs, stumpings and awards will appear after completed matches."
    >
      <div className={styles.table}>
        <div className={`${styles.grid} ${styles.header}`}>
          <span className={styles.playerHeader}>Player</span>
          <SortButton label="C" column="catches" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by catches" />
          <SortButton label="ST" column="stumpings" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by stumpings" />
          <SortButton label="RO" column="runOuts" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by run outs" />
          <SortButton label="MoM" column="manOfTheMatch" activeColumn={state.sortKey} direction={state.sortDir} onSort={onSort} ariaLabel="Sort by Man of the Match awards" />
        </div>
        {players.map((player) => (
          <div key={player.playerId ?? player.playerName} className={`${styles.grid} ${styles.row}`}>
            <button type="button" className={styles.playerButton} onClick={() => navigate(`/player/${encodeURIComponent(player.playerId)}`)}>
              {formatName(player.playerName)}
              <small>{number(player.totalMatchesPlayed)} matches</small>
            </button>
            <span>{number(player.totalCatches)}</span>
            <span>{number(player.totalStumpings)}</span>
            <span>{number(player.totalRunOuts)}</span>
            <strong>{number(player.manOfTheMatchAwards)}</strong>
          </div>
        ))}
      </div>
    </LeaderboardState>
  );
}
