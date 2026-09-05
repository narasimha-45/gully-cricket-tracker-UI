import { useEffect, useMemo, useReducer, useState } from "react";
import { Badge, Trophy } from "lucide-react";
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
import { useBattingLeaderboard, useTeamsForSeason } from "../hooks/queries";
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
  position: [],
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

export default function BattingStats({ isOverall = false }) {
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
      battingPosition: selectedNumbersOrUndefined(state.filters.position),
      teamId: selectedOrUndefined(state.filters.teamId),
      opponentTeamId: selectedOrUndefined(state.filters.opponentTeamId),
    }),
    [statsSeasonIds, matchType, state.filters],
  );

  const statsQuery = useBattingLeaderboard(apiFilters);

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
        key: "position",
        label: "Batting Position",
        multiple: true,
        options: [
          { value: "All", label: "All" },
          ...Array.from({ length: 11 }, (_, index) => ({
            value: String(index + 1),
            label: index < 2 ? `${index + 1} · Opener` : String(index + 1),
          })),
        ],
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
          return number(player.inningsPlayed);
        case "runs":
          return number(player.totalRuns);
        case "balls":
          return number(player.totalBallsFaced);
        case "average":
          return number(player.average);
        case "strikeRate":
          return number(player.strikeRate);
        case "highest":
          return number(player.highestScore);
        default:
          return 0;
      }
    };
    return [...(statsQuery.data || [])].sort((a, b) => {
      const delta = getSortValue(a) - getSortValue(b);
      return state.sortDir === "asc" ? delta : -delta;
    });
  }, [statsQuery.data, state.sortDir, state.sortKey]);

  const onSort = (column) =>
    dispatch({ type: LEADERBOARD_ACTIONS.SORT, payload: column });

  return (
    <div className={styles.page}>
      <header className={styles.statsHeading}>
        <div>
          <span className={styles.statsKicker}>
            <Trophy size={13} /> Batting
          </span>
          <h2>Batting stats</h2>
        </div>
        <span className={styles.statsIcon}>
          <Badge size={21} />
        </span>
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
        emptyTitle="No batting stats"
        emptySubtitle="Complete a match or adjust the filters to see batting leaders."
      >
        <div className={styles.table}>
          <div className={`${styles.header} ${styles.battingGrid}`}>
            <span className={styles.playerHeader}>Player</span>
            <SortButton
              label="I"
              column="innings"
              activeColumn={state.sortKey}
              direction={state.sortDir}
              onSort={onSort}
              ariaLabel="Sort by innings"
            />
            <SortButton
              label="R"
              column="runs"
              activeColumn={state.sortKey}
              direction={state.sortDir}
              onSort={onSort}
              ariaLabel="Sort by runs"
            />
            <SortButton
              label="Avg"
              column="average"
              activeColumn={state.sortKey}
              direction={state.sortDir}
              onSort={onSort}
            />
            <SortButton
              label="SR"
              column="strikeRate"
              activeColumn={state.sortKey}
              direction={state.sortDir}
              onSort={onSort}
            />
            <SortButton
              label="HS"
              column="highest"
              activeColumn={state.sortKey}
              direction={state.sortDir}
              onSort={onSort}
              ariaLabel="Sort by highest score"
            />
            <SortButton
              label="0s"
              column="ducks"
              activeColumn={state.sortKey}
              direction={state.sortDir}
              onSort={onSort}
              ariaLabel="Sort by ducks"
            />
          </div>

          {players.map((player) => (
            <div
              key={player.playerId ?? player.playerName}
              className={`${styles.row} ${styles.battingGrid}`}
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
                {number(player.inningsPlayed)}
              </span>
              <span className={`${styles.stat} ${styles.primaryStat}`}>
                {number(player.totalRuns)}
              </span>
              <span className={styles.stat}>
                {player.average == null
                  ? number(player.totalRuns)
                  : number(player.average).toFixed(1)}
              </span>
              <span className={styles.stat}>
                {number(player.strikeRate).toFixed(1)}
              </span>
              <span className={styles.stat}>{number(player.highestScore)}</span>
              <span className={styles.stat}>{number(player.ducks)}</span>
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
        title="Batting filters"
      />
    </div>
  );
}
