import { useState } from "react";
import { ArrowDown, ArrowUp, Filter, Handshake } from "lucide-react";
import { StatsSkeleton } from "../features/stats/components/LeaderboardView";
import EmptyState from "../components/common/EmptyState";
import { useOutletContext } from "react-router-dom";
import StatsFilterSheet from "../components/stats/StatsFilterSheet";
import { usePartnerships, useTeamsForSeason } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./Partnerships.module.css";

const VIEWS = [
  ["aggregated", "Partnership Totals"],
  ["instances", "Highest Partnerships"],
];
const DEFAULT_FILTERS = {
  inningsNumber: "All",
  result: "All",
  partnershipNumber: "All",
  teamId: "All",
  opponentTeamId: "All",
};

const value = (item, ...keys) => keys.map((key) => item?.[key]).find((item) => item != null) ?? "—";
const pairName = (item) => `${value(item, "batter1", "player1Name", "playerOneName")} & ${value(item, "batter2", "player2Name", "playerTwoName")}`;

function PartnershipPair({ partnership, showStar = false }) {
  const firstName = value(partnership, "batter1", "player1Name", "playerOneName");
  const secondName = value(partnership, "batter2", "player2Name", "playerTwoName");
  return (
    <span className={styles.pairDisplay}>
      <span className={styles.pairNames}>
        <span>{formatName(firstName)}</span>
        <i>&amp;</i>
        <span>{formatName(secondName)}</span>
      </span>
      <span className={styles.pairContributions}>
        <span>{value(partnership, "player1Runs")} ({value(partnership, "player1BallsFaced")}){showStar ? "*" : ""}</span>
      <i>—</i>
        <span>{value(partnership, "player2Runs")} ({value(partnership, "player2BallsFaced")}){showStar ? "*" : ""}</span>
      </span>
    </span>
  );
}

export default function Partnerships() {
  const [view, setView] = useState("aggregated");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState({ key: "runs", direction: "desc" });
  const { globalFilter = "all" } = useOutletContext() || {};
  const seasonId = globalFilter !== "all" ? globalFilter : "ALL";
  const teamsQuery = useTeamsForSeason(seasonId);
  const teamOptions = (teamsQuery.data || [])
    .map((team) => ({ value: team.teamId || team.id, label: team.teamName || team.name }))
    .filter((team) => team.value);
  const query = usePartnerships(view, {
    seasonId: globalFilter !== "all" ? globalFilter : undefined,
    inningsNumber: filters.inningsNumber === "All" ? undefined : filters.inningsNumber,
    result: filters.result === "All" ? undefined : filters.result === "Won" ? "WIN" : "LOSS",
    partnershipNumber: filters.partnershipNumber === "All" ? undefined : filters.partnershipNumber,
    teamId: filters.teamId === "All" ? undefined : filters.teamId,
    opponentTeamId: filters.opponentTeamId === "All" ? undefined : filters.opponentTeamId,
  });
  const data = [...(query.data || [])].sort((left, right) => {
    const getSortValue = (item) => {
      if (sort.key === "pair") return pairName(item).toLowerCase();
      if (sort.key === "innings") return Number(value(item, "totalInnings", "innings")) || 0;
      if (sort.key === "average") return Number(value(item, "averagePartnership")) || 0;
      if (sort.key === "hs") return Number(value(item, "highestPartnership", "highest")) || 0;
      if (sort.key === "balls") return Number(value(item, "ballsFaced", "balls")) || 0;
      if (sort.key === "foursHit") return Number(value(item, "foursHit")) || 0;
      return Number(value(item, view === "aggregated" ? "totalRuns" : "runsScored")) || 0;
    };
    const leftValue = getSortValue(left);
    const rightValue = getSortValue(right);
    const result = typeof leftValue === "string" ? leftValue.localeCompare(rightValue) : leftValue - rightValue;
    return sort.direction === "asc" ? result : -result;
  });
  const filterDefinitions = [
    { key: "inningsNumber", label: "INN", options: ["All", "1", "2"] },
    { key: "result", label: "Match result", options: ["All", "Won", "Lost"] },
    { key: "partnershipNumber", label: "Partnership number", options: ["All", "1", "2", "3", "4", "5"] },
    { key: "teamId", label: "Team", options: [{ value: "All", label: "All" }, ...teamOptions] },
    { key: "opponentTeamId", label: "Opponent", options: [{ value: "All", label: "All" }, ...teamOptions] },
  ];
  const activeFilters = filterDefinitions.flatMap((definition) => {
    const selected = filters[definition.key];
    if (!selected || selected === "All") return [];
    const option = definition.options.find((item) =>
      (typeof item === "string" ? item : item.value) === selected,
    );
    return [{ label: definition.label, value: typeof option === "string" ? option : option?.label || selected }];
  });

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <span className={styles.kicker}><Handshake size={13} /> Batting chemistry</span>
          <h2>Partnerships</h2>
        </div>
        <span className={styles.headingIcon}><Handshake size={22} /></span>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.filterSummary}>
          {activeFilters.length ? activeFilters.map((filter) => <span className={styles.filterChip} key={filter.label}>{filter.label}: <b>{filter.value}</b></span>) : "All partnerships"}
        </div>
        <button type="button" className={styles.filterButton} onClick={() => setFilterOpen(true)}><Filter size={15} /> Filters</button>
      </div>
      <div className={styles.segmented} role="tablist" aria-label="Partnerships view">
        {VIEWS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            className={view === key ? styles.segmentActive : styles.segment}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {query.isLoading && <StatsSkeleton rows={5} />}

      {!query.isLoading && query.error && (
        <div className={styles.errorCard} role="alert">
          <strong>Couldn’t load partnerships</strong>
          <span>{query.error.message}</span>
          <button type="button" onClick={query.refetch}>Try again</button>
        </div>
      )}

      {!query.isLoading && !query.error && data.length === 0 && (
        <EmptyState
          title="No partnerships yet"
          subtitle="Complete a match to start building partnership records."
        />
      )}

      {!query.isLoading && !query.error && data.length > 0 && view === "aggregated" && (
        <div className={styles.table}>
          <div className={`${styles.grid} ${styles.header}`}>
            <SortHeader label="Pair" sortKey="pair" sort={sort} onSort={setSort} />
            <SortHeader label="INN" sortKey="innings" sort={sort} onSort={setSort} />
            <SortHeader label="R" sortKey="runs" sort={sort} onSort={setSort} />
            <SortHeader label="Avg" sortKey="average" sort={sort} onSort={setSort} />
            <SortHeader label="HS" sortKey="hs" sort={sort} onSort={setSort} />
          </div>
          {data.map((pair) => (
            <div
              key={`${pair.player1Id || pair.batter1}-${pair.player2Id || pair.batter2}`}
              className={`${styles.grid} ${styles.row}`}
            >
              <span className={styles.pairCell}>
                <strong><PartnershipPair partnership={pair} /></strong>
                <small>{value(pair, "totalInnings", "innings")} innings</small>
              </span>
              <span>{value(pair, "totalInnings", "innings")}</span>
              <span className={styles.primaryStat}>{value(pair, "runs", "totalRuns")}</span>
              <span>{value(pair, "averagePartnership")}</span>
              <span>
                {value(pair, "highest", "highestPartnership")}
                {pair.unbeatenPartnerships > 0 ? "*" : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {!query.isLoading && !query.error && data.length > 0 && view === "instances" && (
        <div className={styles.instanceTable}>
          <div className={`${styles.instanceGrid} ${styles.header}`}>
            <SortHeader label="Pair" sortKey="pair" sort={sort} onSort={setSort} /><SortHeader label="R" sortKey="runs" sort={sort} onSort={setSort} /><SortHeader label="B" sortKey="balls" sort={sort} onSort={setSort} /><SortHeader label="4s" sortKey="foursHit" sort={sort} onSort={setSort} />
          </div>
          {data.map((instance) => (
            <div key={instance.partnershipId || instance.id} className={styles.instanceGrid}>
              <span className={styles.pairCell}><strong><PartnershipPair partnership={instance} showStar={!instance.partnershipBroken} /></strong><small>{value(instance, "teamName")} vs {value(instance, "opponentTeamName", "opponent")} · {value(instance, "seasonName", "season")}</small></span>
              <strong className={styles.primaryStat}>{value(instance, "runsScored", "runs", "partnershipRuns")}</strong>
              <span>{value(instance, "ballsFaced", "balls")}</span>
              <span>{value(instance, "foursHit")}</span>
            </div>
          ))}
        </div>
      )}
      <StatsFilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} filters={filterDefinitions} selectedFilters={filters} onChange={setFilters} title="Filter partnerships" />
    </div>
  );
}

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  return (
    <button type="button" className={styles.sortHeader} onClick={() => onSort({ key: sortKey, direction: active && sort.direction === "desc" ? "asc" : "desc" })}>
      {label}
      {active && (sort.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
    </button>
  );
}
