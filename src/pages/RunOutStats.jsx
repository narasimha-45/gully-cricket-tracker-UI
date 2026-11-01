import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";

import MatchTypeTabs from "../components/stats/MatchTypeTabs";
import { useRunOutLeaderboard } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import { normalizeSeasonFilter } from "../utils/statsFilterUtils";

import styles from "./RunOutStats.module.css";

const VIEWS = [
  { id: "players", label: "Player Run-outs" },
  { id: "partnerships", label: "Partnership Run-outs" },
];

const toNumber = (value) => Number(value) || 0;

function SortHeader({ label, column, sort, onSort }) {
  const active = sort.key === column;

  const handleSort = () => {
    if (!active) {
      onSort({
        key: column,
        direction: column === "name" || column === "pairName" ? "asc" : "desc",
      });
      return;
    }

    onSort({
      key: column,
      direction: sort.direction === "desc" ? "asc" : "desc",
    });
  };

  return (
    <button
      type="button"
      className={`${styles.sortButton} ${active ? styles.sortActive : ""}`}
      onClick={handleSort}
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>

      {active &&
        (sort.direction === "asc" ? (
          <ArrowUp size={12} strokeWidth={2} />
        ) : (
          <ArrowDown size={12} strokeWidth={2} />
        ))}
    </button>
  );
}

function sortRows(rows, sort) {
  return [...rows].sort((a, b) => {
    const left = a[sort.key];
    const right = b[sort.key];

    let comparison;

    if (typeof left === "string") {
      comparison = left.localeCompare(right || "", undefined, {
        sensitivity: "base",
      });
    } else {
      comparison = toNumber(left) - toNumber(right);
    }

    if (comparison === 0) {
      return (
        toNumber(b.involved ?? b.runOuts) - toNumber(a.involved ?? a.runOuts)
      );
    }

    return sort.direction === "asc" ? comparison : -comparison;
  });
}

/* Individual player run-out statistics */

function buildPlayerStats(partnerships) {
  const players = new Map();

  for (const pair of partnerships) {
    const firstOut = toNumber(pair.player1Out);
    const secondOut = toNumber(pair.player2Out);

    for (const side of [1, 2]) {
      const id = pair[`player${side}Id`];
      const name = pair[`player${side}Name`];

      if (id == null) continue;

      const personallyOut = side === 1 ? firstOut : secondOut;

      const partnerOut = side === 1 ? secondOut : firstOut;

      const key = String(id);

      const current = players.get(key) || {
        id,
        name: formatName(name || "Unknown"),
        involved: 0,
        personallyOut: 0,
        partnerOut: 0,
      };

      current.involved += personallyOut + partnerOut;
      current.personallyOut += personallyOut;
      current.partnerOut += partnerOut;

      players.set(key, current);
    }
  }

  return [...players.values()].filter((player) => player.involved > 0);
}

/* Batting pair run-out statistics */

function buildPartnershipStats(partnerships) {
  return partnerships
    .filter((pair) => toNumber(pair.runOuts) > 0)
    .map((pair) => {
      const player1Name = formatName(pair.player1Name || "Unknown");

      const player2Name = formatName(pair.player2Name || "Unknown");

      return {
        ...pair,
        player1Name,
        player2Name,
        pairName: `${player1Name} & ${player2Name}`,
        partnershipCount: toNumber(pair.partnerships),
        runOuts: toNumber(pair.runOuts),
        player1Out: toNumber(pair.player1Out),
        player2Out: toNumber(pair.player2Out),
      };
    });
}

/* Player leaderboard */

function PlayersTable({ players, navigate }) {
  const [sort, setSort] = useState({
    key: "involved",
    direction: "desc",
  });

  const sortedPlayers = useMemo(() => sortRows(players, sort), [players, sort]);

  const columns = [
    { label: "Player", key: "name" },
    { label: "Involved", key: "involved" },
    { label: "Run Out", key: "personallyOut" },
    { label: "Partner Out", key: "partnerOut" },
  ];

  return (
    <div className={styles.tableContainer}>
      <table className={`${styles.table} ${styles.playersTable}`}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                <SortHeader
                  label={column.label}
                  column={column.key}
                  sort={sort}
                  onSort={setSort}
                />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sortedPlayers.map((player) => (
            <tr key={player.id}>
              <td className={styles.nameColumn}>
                <button
                  type="button"
                  className={styles.playerLink}
                  onClick={() =>
                    navigate(`/player/${encodeURIComponent(player.id)}`)
                  }
                >
                  {player.name}
                </button>
              </td>

              <td className={`${styles.numericCell} ${styles.primaryValue}`}>
                {player.involved}
              </td>

              <td className={styles.numericCell}>{player.personallyOut}</td>

              <td className={styles.numericCell}>{player.partnerOut}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Partnership leaderboard */

function PartnershipsTable({ partnerships }) {
  const [sort, setSort] = useState({
    key: "runOuts",
    direction: "desc",
  });

  const sortedPartnerships = useMemo(
    () => sortRows(partnerships, sort),
    [partnerships, sort],
  );

  const columns = [
    { label: "Batting Pair", key: "pairName" },
    { label: "Partnerships", key: "partnershipCount" },
    { label: "Run-outs", key: "runOuts" },
  ];

  return (
    <div className={styles.tableContainer}>
      <table className={`${styles.table} ${styles.partnershipsTable}`}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                <SortHeader
                  label={column.label}
                  column={column.key}
                  sort={sort}
                  onSort={setSort}
                />
              </th>
            ))}

            <th scope="col">Who Got Out</th>
          </tr>
        </thead>

        <tbody>
          {sortedPartnerships.map((pair) => (
            <tr key={`${pair.player1Id}-${pair.player2Id}`}>
              <td className={styles.nameColumn}>
                <div className={styles.pairName}>
                  <span>{pair.player1Name}</span>
                  <span className={styles.pairSeparator}>&</span>
                  <span>{pair.player2Name}</span>
                </div>
              </td>

              <td className={styles.numericCell}>{pair.partnershipCount}</td>

              <td className={`${styles.numericCell} ${styles.primaryValue}`}>
                {pair.runOuts}
              </td>

              <td className={styles.breakdownColumn}>
                <div className={styles.dismissalBreakdown}>
                  <span className={styles.dismissalItem}>
                    <span className={styles.dismissalName}>
                      {pair.player1Name}
                    </span>
                    <strong>{pair.player1Out}</strong>
                  </span>

                  <span className={styles.dismissalItem}>
                    <span className={styles.dismissalName}>
                      {pair.player2Name}
                    </span>
                    <strong>{pair.player2Out}</strong>
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Main page */

export default function RunOutStats({ isOverall = false }) {
  const navigate = useNavigate();
  const { seasonId } = useParams();
  const { globalFilter } = useOutletContext() || {};

  const [activeView, setActiveView] = useState("players");
  const [matchType, setMatchType] = useState("OVERS");

  const seasonIds = isOverall
    ? normalizeSeasonFilter(globalFilter)
    : seasonId
      ? [seasonId]
      : [];

  const { data, isLoading, isError, refetch } = useRunOutLeaderboard({
    seasonId: seasonIds.length ? seasonIds : undefined,
    matchType,
  });

  const partnerships = useMemo(() => buildPartnershipStats(data || []), [data]);

  const players = useMemo(() => buildPlayerStats(data || []), [data]);

  const showPlayers = activeView === "players";

  const hasData = showPlayers ? players.length > 0 : partnerships.length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h2 className={styles.title}>Run-outs</h2>
      </div>

      <MatchTypeTabs value={matchType} onChange={setMatchType} />

      <div
        className={styles.viewTabs}
        role="tablist"
        aria-label="Run-out statistics"
      >
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            id={`runout-tab-${view.id}`}
            role="tab"
            aria-selected={activeView === view.id}
            aria-controls="runout-stats-panel"
            className={`${styles.viewTab} ${
              activeView === view.id ? styles.viewTabActive : ""
            }`}
            onClick={() => setActiveView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>

      <section
        id="runout-stats-panel"
        role="tabpanel"
        aria-labelledby={`runout-tab-${activeView}`}
        className={styles.content}
      >
        {isLoading && (
          <div className={styles.message}>Loading run-out statistics...</div>
        )}

        {isError && (
          <div className={styles.message} role="alert">
            <p>Unable to load run-out statistics.</p>

            <button
              type="button"
              className={styles.retryButton}
              onClick={() => refetch()}
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && !hasData && (
          <div className={styles.message}>No run-out records found.</div>
        )}

        {!isLoading &&
          !isError &&
          hasData &&
          (showPlayers ? (
            <PlayersTable players={players} navigate={navigate} />
          ) : (
            <PartnershipsTable partnerships={partnerships} />
          ))}
      </section>
    </div>
  );
}
