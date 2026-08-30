import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Crosshair, Filter, Swords } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import EmptyState from "../components/common/EmptyState";
import MatchTypeTabs from "../components/stats/MatchTypeTabs";
import PlayerAutocomplete from "../components/PlayerAutocomplete";
import StatsFilterSheet from "../components/stats/StatsFilterSheet";
import { StatsSkeleton } from "../features/stats/components/LeaderboardView";
import { usePlayerComparison, useRivalries, useTeamsForSeason } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./Rivalry.module.css";

const MODES = [
  ["rivalry", "Batter vs bowler"],
  ["players", "Player vs player"],
];
const DEFAULT_FILTERS = { inningsNumber: "All", result: "All", teamId: "All", opponentTeamId: "All", minBallsFaced: "All", minRuns: "All", minDismissals: "All" };
const value = (item, ...keys) => keys.map((key) => item?.[key]).find((entry) => entry != null) ?? "—";
const playerId = (player) => player?.playerId || player?.id || player?._id || "";

export default function Rivalry() {
  const { globalFilter = "all" } = useOutletContext() || {};
  const seasonId = globalFilter !== "all" ? globalFilter : undefined;
  const [matchType, setMatchType] = useState("OVERS");
  const [mode, setMode] = useState("rivalry");
  const [batter, setBatter] = useState(null);
  const [bowler, setBowler] = useState(null);
  const [playerOne, setPlayerOne] = useState(null);
  const [playerTwo, setPlayerTwo] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const teamsQuery = useTeamsForSeason("ALL");
  const rivalryFilters = {
    seasonId,
    matchType,
    batsmanId: playerId(batter) || undefined,
    bowlerId: playerId(bowler) || undefined,
    inningsNumber: filters.inningsNumber === "All" ? undefined : filters.inningsNumber,
    matchResult: filters.result === "All" ? undefined : filters.result === "Won" ? "WIN" : "LOSS",
    teamId: filters.teamId === "All" ? undefined : filters.teamId,
    opponentTeamId: filters.opponentTeamId === "All" ? undefined : filters.opponentTeamId,
    minBallsFaced: filters.minBallsFaced === "All" ? undefined : filters.minBallsFaced,
    minRuns: filters.minRuns === "All" ? undefined : filters.minRuns,
    minDismissals: filters.minDismissals === "All" ? undefined : filters.minDismissals,
  };
  const rivalryQuery = useRivalries(rivalryFilters);
  const comparisonQuery = usePlayerComparison({ seasonId, matchType, player1Id: playerId(playerOne) || undefined, player2Id: playerId(playerTwo) || undefined });
  const teams = useMemo(() => (teamsQuery.data || []).map((team) => ({ value: team.teamId || team.id, label: formatName(team.teamName || team.name) })).filter((team) => team.value), [teamsQuery.data]);
  const activeFilterCount = Object.values(filters).filter((entry) => entry !== "All").length;
  const filterDefinitions = [
    { key: "inningsNumber", label: "INN", options: ["All", "1", "2"] },
    { key: "result", label: "Match result", options: ["All", "Won", "Lost"] },
    { key: "teamId", label: "Team", options: [{ value: "All", label: "All" }, ...teams] },
    { key: "opponentTeamId", label: "Opponent", options: [{ value: "All", label: "All" }, ...teams] },
    { key: "minBallsFaced", label: "Minimum balls", options: ["All", "5", "10", "20", "30"] },
    { key: "minRuns", label: "Minimum runs", options: ["All", "5", "10", "20", "30"] },
    { key: "minDismissals", label: "Minimum dismissals", options: ["All", "1", "2", "3"] },
  ];
  const activeFilters = filterDefinitions.flatMap((definition) => {
    const selected = filters[definition.key];
    if (!selected || selected === "All") return [];
    const option = definition.options.find((item) =>
      (typeof item === "string" ? item : item.value) === selected,
    );
    return [{ label: definition.label, value: typeof option === "string" ? option : option?.label || selected }];
  });

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setBatter(null); setBowler(null); setPlayerOne(null); setPlayerTwo(null);
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><span className={styles.kicker}><Swords size={13} /> Matchups</span><h2>Rivalries</h2></div>
        <span className={styles.headingIcon}><Crosshair size={22} /></span>
      </header>
      <MatchTypeTabs value={matchType} onChange={setMatchType} />
      <div className={styles.modeTabs} role="tablist" aria-label="Comparison type">
        {MODES.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={mode === key} className={mode === key ? styles.modeActive : styles.mode} onClick={() => changeMode(key)}>{label}</button>)}
      </div>
      {mode === "rivalry" ? (
        <section className={styles.compareBox}>
          <div className={styles.compareTop}><span>Choose a batter and bowler</span><button type="button" className={styles.filterButton} onClick={() => setFilterOpen(true)}><Filter size={15} /> {activeFilterCount ? `${activeFilterCount} filters` : "Filters"}</button></div>
          {activeFilters.length > 0 && <div className={styles.activeFilters}>{activeFilters.map((filter) => <span className={styles.filterChip} key={filter.label}>{filter.label}: <b>{filter.value}</b></span>)}</div>}
          <div className={styles.playerGrid}>
            <PlayerAutocomplete label="Batter" value={batter} onChange={setBatter} excludeId={playerId(bowler)} />
            <PlayerAutocomplete label="Bowler" value={bowler} onChange={setBowler} excludeId={playerId(batter)} />
          </div>
        </section>
      ) : (
        <section className={styles.compareBox}>
          <div className={styles.compareTop}><span>Choose two players to compare</span><span className={styles.endpointNote}>Season filter applies above</span></div>
          <div className={styles.playerGrid}>
            <PlayerAutocomplete label="Player one" value={playerOne} onChange={setPlayerOne} excludeId={playerId(playerTwo)} />
            <PlayerAutocomplete label="Player two" value={playerTwo} onChange={setPlayerTwo} excludeId={playerId(playerOne)} />
          </div>
        </section>
      )}
      {mode === "rivalry" ? (
        rivalryQuery.isLoading ? <StatsSkeleton rows={5} /> : rivalryQuery.error ? <ErrorState error={rivalryQuery.error} retry={rivalryQuery.refetch} /> : rivalryQuery.data?.length ? <RivalryTable data={rivalryQuery.data} /> : <EmptyState title="No rivalry data" subtitle="Try different filters or complete more matches." />
      ) : (
        !playerOne || !playerTwo ? <EmptyState title="Choose two players" subtitle="Type at least two letters in each field to find players." /> : comparisonQuery.isLoading ? <StatsSkeleton rows={3} /> : comparisonQuery.error ? <ErrorState error={comparisonQuery.error} retry={comparisonQuery.refetch} /> : <PlayerComparison data={comparisonQuery.data} />
      )}
      <StatsFilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} filters={filterDefinitions} selectedFilters={filters} onChange={setFilters} title="Filter rivalries" />
    </div>
  );
}

function ErrorState({ error, retry }) { return <div className={styles.errorCard} role="alert"><strong>Couldn’t load comparison</strong><span>{error.message}</span><button type="button" onClick={retry}>Try again</button></div>; }

function RivalryTable({ data }) {
  const [sort, setSort] = useState({ key: "runs", direction: "desc" });
  const sortedData = [...data].sort((left, right) => {
    const leftValue = Number(value(left, sort.key)) || 0;
    const rightValue = Number(value(right, sort.key)) || 0;
    return sort.direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
  });
  const headers = [
    ["totalInnings", "INN"],
    ["totalRuns", "R"],
    ["totalBallsFaced", "B"],
    ["wicketsTaken", "W"],
  ];

  const toggleSort = (key) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
  }));

  return (
    <div className={styles.table}>
      <div className={`${styles.row} ${styles.tableHeader}`}>
        <span>Contest</span>
        {headers.map(([key, label]) => (
          <button type="button" key={key} className={styles.sortHeader} onClick={() => toggleSort(key)}>
            {label}
            {sort.key === key && (sort.direction === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
          </button>
        ))}
      </div>
      {sortedData.map((item, index) => (
        <div className={styles.row} key={`${value(item, "batterId")}-${value(item, "bowlerId")}-${index}`}>
          <span className={styles.contest}>
            <strong>{formatName(value(item, "batterName"))}</strong>
            <small>vs {formatName(value(item, "bowlerName"))}</small>
          </span>
          <span>{value(item, "totalInnings")}</span>
          <strong className={styles.runs}>{value(item, "totalRuns")}</strong>
          <span>{value(item, "totalBallsFaced")}</span>
          <span className={styles.dismissals}>{value(item, "wicketsTaken")}</span>
        </div>
      ))}
    </div>
  );
}

function PlayerComparison({ data }) {
  const first = data?.player1 || {};
  const second = data?.player2 || {};
  const sections = [
    {
      label: "Match record",
      stats: [
        ["Matches", first.matchesPlayed, second.matchesPlayed],
        ["Wins", first.matchesWon, second.matchesWon],
        ["Player of the match", first.playerOfTheMatchAwards, second.playerOfTheMatchAwards],
      ],
    },
    {
      label: "Batting",
      stats: [
        ["Runs", first.batting?.totalRuns, second.batting?.totalRuns],
        ["Average", first.batting?.average, second.batting?.average],
        ["Strike rate", first.batting?.strikeRate, second.batting?.strikeRate],
        ["Fours", first.batting?.totalFours, second.batting?.totalFours],
        ["Sixes", first.batting?.totalSixes, second.batting?.totalSixes],
        ["Highest score", first.batting?.highestScore, second.batting?.highestScore],
      ],
    },
    {
      label: "Bowling",
      stats: [
        ["Wickets", first.bowling?.totalWickets, second.bowling?.totalWickets],
        ["Economy", first.bowling?.economyRate, second.bowling?.economyRate],
        ["Average", first.bowling?.average, second.bowling?.average],
        ["Maidens", first.bowling?.totalMaidens, second.bowling?.totalMaidens],
        ["Best figures", bestBowling(first), bestBowling(second)],
      ],
    },
    {
      label: "Fielding",
      stats: [
        ["Catches", first.fielding?.totalCatches, second.fielding?.totalCatches],
        ["Run outs", first.fielding?.totalRunOuts, second.fielding?.totalRunOuts],
        ["Stumpings", first.fielding?.totalStumpings, second.fielding?.totalStumpings],
      ],
    },
  ];
  return (
    <section className={styles.comparisonCard}>
      <div className={styles.comparisonPlayers}>
        <div className={styles.playerIdentity}><span>{formatName(first.playerName).slice(0, 1)}</span><strong>{formatName(first.playerName)}</strong></div>
        <span className={styles.vsBadge}>VS</span>
        <div className={`${styles.playerIdentity} ${styles.playerIdentityRight}`}><span>{formatName(second.playerName).slice(0, 1)}</span><strong>{formatName(second.playerName)}</strong></div>
      </div>
      {sections.map((section) => (
        <div className={styles.comparisonSection} key={section.label}>
          <h4>{section.label}</h4>
          <div className={styles.comparisonGrid}>
            {section.stats.map(([label, firstValue, secondValue]) => (
              <div key={label}>
                <strong>{firstValue ?? "—"}</strong>
                <span>{label}</span>
                <strong>{secondValue ?? "—"}</strong>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function bestBowling(player) {
  const figures = player.bowling?.bestBowlingFigures;
  if (!figures) return "—";
  return `${figures.wickets ?? 0}/${figures.runsConceded ?? 0}`;
}
