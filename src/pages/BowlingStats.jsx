import { useEffect, useMemo, useReducer, useState } from "react";
import { Shield } from "lucide-react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import MatchTypeTabs from "../components/stats/MatchTypeTabs";
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
import {
  buildActiveFilterLabels,
  normalizeSeasonFilter,
  selectedMappedOrUndefined,
  selectedNumbersOrUndefined,
  selectedOrUndefined,
} from "../utils/statsFilterUtils";
import styles from "./Leaderboards.module.css";

const DEFAULT_FILTERS = Object.freeze({
  innings: [],
  result: [],
  opponentTeamId: [],
  teamId: [],
});
const MATCH_RESULT = {
  Won: "WIN",
  Lost: "LOSS",
  Tied: "TIE",
  "No Result": "NO_RESULT",
};
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
  const globalFilter = isOverall ? outletContext?.globalFilter : undefined;
  const statsSeasonIds = !isOverall
    ? seasonId ? [seasonId] : []
    : normalizeSeasonFilter(globalFilter);
  const teamsSeasonId = statsSeasonIds.length === 1 ? statsSeasonIds[0] : "ALL";

  const [matchType, setMatchType] = useState("OVERS");

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
      if (id && name && !unique.has(id))
        unique.set(id, { value: id, label: formatName(name) });
    });
    return [...unique.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [teamsQuery.data]);

  const apiFilters = useMemo(
    () => ({
      seasonId: statsSeasonIds.length ? statsSeasonIds : undefined,
      matchType,
      inningsNumber: selectedNumbersOrUndefined(state.filters.innings),
      result: selectedMappedOrUndefined(state.filters.result, MATCH_RESULT),
      teamId: selectedOrUndefined(state.filters.teamId),
      opponentTeamId: selectedOrUndefined(state.filters.opponentTeamId),
    }),
    [statsSeasonIds, matchType, state.filters],
  );

  const statsQuery = useBowlingLeaderboard(apiFilters);

  const filterDefinitions = useMemo(() => {
    const inningsCount = matchType === "TEST" ? 4 : 2;
    return [
      {
        key: "innings",
        label: "INN",
        multiple: true,
        options: [
          { value: "All", label: "All" },
          ...Array.from({ length: inningsCount }, (_, index) => ({
            value: String(index + 1),
            label: `Innings ${index + 1}`,
          })),
        ],
      },
      {
        key: "result",
        label: "Match Result",
        multiple: true,
        options: ["All", "Won", "Lost", "Tied", "No Result"],
      },
      {
        key: "opponentTeamId",
        label: "Opponent",
        multiple: true,
        options: [{ value: "All", label: "All" }, ...teams],
      },
      {
        key: "teamId",
        label: "Team",
        multiple: true,
        options: [{ value: "All", label: "All" }, ...teams],
      },
    ];
  }, [matchType, teams]);

  const activeLabels = useMemo(
    () => buildActiveFilterLabels(filterDefinitions, state.filters).map((item) => item.text),
    [filterDefinitions, state.filters],
  );

  const players = useMemo(() => {
    const getSortValue = (player) => {
      switch (state.sortKey) {
        case "innings":
          return number(player.inningsBowled);
        case "wickets":
          return number(player.totalWickets);
        case "overs":
          return number(player.totalOversBowled);
        case "economy":
          return number(player.economyRate);
        case "average":
          return number(player.totalWickets) === 0 || player.average == null
            ? Number.POSITIVE_INFINITY
            : number(player.average);
        case "fiveWicketHauls":
          return number(player.fiveWicketHauls);
        case "bestBowling": {
          const wickets = number(player.bestBowlingFigures?.wickets);
          const runsConceded = number(player.bestBowlingFigures?.runsConceded);
          return wickets * 1000 - runsConceded;
        }
        default:
          return 0;
      }
    };
    return [...(statsQuery.data || [])].sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);
      const delta = aValue - bValue;
      return state.sortDir === "asc" ? delta : -delta;
    });
  }, [statsQuery.data, state.sortDir, state.sortKey]);

  const onSort = (column) =>
    dispatch({ type: LEADERBOARD_ACTIONS.SORT, payload: column });

  return (
    <div className={styles.page}>
      <header className={styles.statsHeading}>
        <div><span className={styles.statsKicker}><Shield size={13} /> Bowling</span><h2>Bowling stats</h2></div>
        <span className={styles.statsIcon}><Shield size={21} /></span>
      </header>
      <MatchTypeTabs value={matchType} onChange={setMatchType} />
      <LeaderboardToolbar
        activeLabels={activeLabels}
        warning={teamsQuery.isError ? "Team filters unavailable" : ""}
        onOpenFilters={() =>
          dispatch({ type: LEADERBOARD_ACTIONS.OPEN_FILTERS })
        }
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
            <SortButton
              label="I"
              column="innings"
              activeColumn={state.sortKey}
              direction={state.sortDir}
              onSort={onSort}
              ariaLabel="Sort by innings bowled"
            />
            <SortButton
              label="W"
              column="wickets"
              activeColumn={state.sortKey}
              direction={state.sortDir}
              onSort={onSort}
              ariaLabel="Sort by wickets"
            />
            <SortButton
              label="O"
              column="overs"
              activeColumn={state.sortKey}
              direction={state.sortDir}
              onSort={onSort}
              ariaLabel="Sort by overs"
            />
            <SortButton
              label="Eco"
              column="economy"
              activeColumn={state.sortKey}
              direction={state.sortDir}
              onSort={onSort}
              ariaLabel="Sort by economy"
            />
            <SortButton
              label="Avg"
              column="average"
              activeColumn={state.sortKey}
              direction={state.sortDir}
              onSort={onSort}
              ariaLabel="Sort by average"
            />
            <SortButton
              label="BB"
              column="bestBowling"
              activeColumn={state.sortKey}
              direction={state.sortDir}
              onSort={onSort}
              ariaLabel="Sort by best bowling"
            />
          </div>

          {players.map((player) => (
            <div
              key={player.playerId ?? player.playerName}
              className={`${styles.row} ${styles.bowlingGrid}`}
            >
              <button
                type="button"
                className={styles.playerButton}
                onClick={() =>
                  navigate(`/player/${encodeURIComponent(player.playerId)}`)
                }
              >
                {formatName(player.playerName)}
                <span className={styles.secondary}>
                  {number(player.totalMatchesPlayed)} matches
                </span>
              </button>
              <span className={styles.stat}>
                {number(player.inningsBowled)}
              </span>
              <span className={`${styles.stat} ${styles.primaryStat}`}>
                {number(player.totalWickets)}
              </span>
              <span className={styles.stat}>
                {formatOvers(player.totalOversBowled)}
              </span>
              <span className={styles.stat}>
                {number(player.economyRate).toFixed(2)}
              </span>
              <span className={styles.stat}>
                {number(player.totalWickets) === 0 || player.average == null
                  ? "—"
                  : number(player.average).toFixed(2)}
              </span>
              <span className={styles.stat}>
                {number(player.bestBowlingFigures.wickets)}/
                {number(player.bestBowlingFigures.runsConceded)}
              </span>
            </div>
          ))}
        </div>
      </LeaderboardState>

      <StatsFilterSheet
        open={state.filtersOpen}
        onClose={() => dispatch({ type: LEADERBOARD_ACTIONS.CLOSE_FILTERS })}
        filters={filterDefinitions}
        selectedFilters={state.filters}
        onChange={(filters) =>
          dispatch({
            type: LEADERBOARD_ACTIONS.APPLY_FILTERS,
            payload: filters,
          })
        }
        title="Bowling filters"
      />
    </div>
  );
}
