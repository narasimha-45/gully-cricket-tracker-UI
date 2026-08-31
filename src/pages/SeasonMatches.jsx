import { useMemo, useReducer, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ConfirmSheet from "../components/common/ConfirmSheet";
import EmptyState from "../components/common/EmptyState";
import LoadingState from "../components/common/LoadingState";
import { useLocalSeasonMatches } from "../features/matches/hooks/useLocalSeasonMatches";
import { useSeasonMatches } from "../hooks/queries";
import { deleteMatch as deleteLocalMatch } from "../storage/matchDB";
import { formatName } from "../utils/helpers";
import { isTestMatch, sameName } from "../utils/matchModel";
import styles from "./SeasonMatches.module.css";

const initialFilters = {
  sortOrder: "NEWEST",
  team: "ALL",
  result: "ALL",
};

function filterReducer(state, action) {
  switch (action.type) {
    case "TEAM":
      return {
        ...state,
        team: action.value,
        result: "ALL",
      };

    case "RESULT":
      return {
        ...state,
        result: action.value,
      };

    case "SORT":
      return {
        ...state,
        sortOrder: action.value,
      };

    default:
      return state;
  }
}

const ballsToOvers = (balls = 0) =>
  `${Math.floor(Number(balls || 0) / 6)}.${Number(balls || 0) % 6}`;

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(value))
    : "";

const scoreLine = (innings) =>
  innings
    ? `${innings.totalRuns}-${innings.wickets} (${ballsToOvers(innings.balls)})`
    : "—";

const isServerDraw = (match) =>
  !match?.winner && /draw|tied/i.test(match?.wonBy || "");

/**
 * Determine the match format from the completed-match API response.
 *
 * Test matches can have:
 * - more than one innings per team
 * - DECLARED innings
 * - follow-on
 *
 * totalOvers can be 0 for Test matches, so we should not depend on it.
 */
const getServerMatchFormat = (match) => {
  const teamAInnings = Array.isArray(match?.teamAInnings)
    ? match.teamAInnings
    : [];

  const teamBInnings = Array.isArray(match?.teamBInnings)
    ? match.teamBInnings
    : [];

  const allInnings = [...teamAInnings, ...teamBInnings];

  const hasSecondInnings =
    teamAInnings.length > 1 ||
    teamBInnings.length > 1 ||
    allInnings.some((innings) => Number(innings?.inningsNumber || 0) > 1);

  const hasTestOnlyState = allInnings.some(
    (innings) =>
      innings?.completionReason === "DECLARED" ||
      innings?.followOn === true ||
      innings?.isFollowOn === true,
  );

  if (isTestMatch(match) || hasSecondInnings || hasTestOnlyState) {
    return "TEST";
  }

  return "LIMITED_OVERS";
};

const formatMatchBadge = (match, format) => {
  if (format === "TEST") {
    return "Test";
  }

  const overs = Number(match?.totalOvers || 0);

  if (overs > 0) {
    return `${overs} over${overs === 1 ? "" : "s"}`;
  }

  return "Limited overs";
};

export default function SeasonMatches() {
  const { seasonId } = useParams();

  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get("tab") === "COMPLETED" ? "COMPLETED" : "LIVE";

  const [filters, dispatch] = useReducer(filterReducer, initialFilters);

  const [pendingDelete, setPendingDelete] = useState(null);

  const localQuery = useLocalSeasonMatches(seasonId);

  const serverQuery = useSeasonMatches(seasonId);

  const localMatches = useMemo(() => localQuery.data || [], [localQuery.data]);

  const serverMatches = useMemo(
    () => serverQuery.data || [],
    [serverQuery.data],
  );

  /**
   * Matches currently stored locally and still being played/setup.
   */
  const liveMatches = useMemo(
    () =>
      localMatches
        .filter((match) => ["SETUP", "setup", "LIVE"].includes(match.status))
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)),
    [localMatches],
  );

  /**
   * Completed locally but not yet successfully synced.
   */
  const pendingMatches = useMemo(
    () =>
      localMatches
        .filter(
          (match) =>
            match.status === "COMPLETED" && match.syncStatus !== "synced",
        )
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)),
    [localMatches],
  );

  /**
   * Completed matches coming from backend.
   */
  const completedMatches = useMemo(
    () => serverMatches.filter((match) => match.matchStatus === "COMPLETED"),
    [serverMatches],
  );

  /**
   * Team dropdown values.
   */
  const teamOptions = useMemo(
    () =>
      [
        ...new Set(
          completedMatches
            .flatMap((match) => [match.teamA, match.teamB])
            .filter(Boolean),
        ),
      ].sort(),
    [completedMatches],
  );

  /**
   * Apply team / result / sorting filters.
   */
  const visibleCompleted = useMemo(
    () =>
      completedMatches
        .filter(
          (match) =>
            filters.team === "ALL" ||
            match.teamA === filters.team ||
            match.teamB === filters.team,
        )
        .filter((match) => {
          if (filters.team === "ALL" || filters.result === "ALL") {
            return true;
          }

          if (filters.result === "DRAW") {
            return isServerDraw(match);
          }

          const won = sameName(match.winner, filters.team);

          return filters.result === "WON" ? won : !won && !isServerDraw(match);
        })
        .sort((a, b) => {
          const aTime = new Date(a.completedAt || a.createdAt || 0).getTime();

          const bTime = new Date(b.completedAt || b.createdAt || 0).getTime();

          return filters.sortOrder === "NEWEST" ? bTime - aTime : aTime - bTime;
        }),
    [completedMatches, filters],
  );

  const openLocalMatch = (match) => {
    if (["SETUP", "setup"].includes(match.status)) {
      navigate(
        match.toss
          ? `/season/${seasonId}/match/${match.id}/live`
          : `/season/${seasonId}/match/${match.id}/toss`,
      );

      return;
    }

    navigate(`/season/${seasonId}/match/${match.id}/live`);
  };

  const requestRemoveLocal = (event, match) => {
    event.stopPropagation();

    setPendingDelete(match);
  };

  const confirmRemoveLocal = async () => {
    if (!pendingDelete) {
      return;
    }

    await deleteLocalMatch(pendingDelete.id);

    localQuery.reload();
  };

  return (
    <div className={styles.page}>
      <div className={styles.tabs} role="tablist" aria-label="Matches">
        {[
          ["LIVE", "Live", liveMatches.length],
          [
            "COMPLETED",
            "Completed",
            completedMatches.length + pendingMatches.length,
          ],
        ].map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={`${styles.tab} ${tab === value ? styles.activeTab : ""}`}
            onClick={() =>
              setSearchParams({
                tab: value,
              })
            }
          >
            {label}

            <span className={styles.count}>{count}</span>
          </button>
        ))}
      </div>

      {tab === "LIVE" && (
        <section aria-label="Live and setup matches">
          {localQuery.loading ? (
            <LoadingState label="Loading matches on this device…" />
          ) : localQuery.error ? (
            <ErrorBlock
              message="Could not read saved matches from this device."
              onRetry={localQuery.reload}
            />
          ) : liveMatches.length === 0 ? (
            <EmptyState
              title="No live matches"
              subtitle="Create a match and start scoring — it will remain available even when you go offline."
            />
          ) : (
            <div className={styles.list}>
              {liveMatches.map((match) => (
                <article key={match.id} className={styles.liveCard}>
                  <button
                    type="button"
                    className={styles.liveCardOpen}
                    onClick={() => openLocalMatch(match)}
                    aria-label={`Open ${formatName(
                      match.teams?.teamA?.name,
                    )} versus ${formatName(match.teams?.teamB?.name)}`}
                  >
                    <span className={styles.cardMain}>
                      <strong>
                        {formatName(match.teams?.teamA?.name)}{" "}
                        <span className={styles.vs}>vs</span>{" "}
                        {formatName(match.teams?.teamB?.name)}
                      </strong>

                      <span className={styles.meta}>
                        {match.status === "LIVE"
                          ? "Live scoring"
                          : match.toss
                            ? "Ready to score"
                            : "Match setup"}
                      </span>
                    </span>

                    <span
                      className={`${styles.statusPill} ${
                        match.status === "LIVE" ? styles.livePill : ""
                      }`}
                    >
                      {match.status === "LIVE" ? "LIVE" : "SETUP"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={styles.deleteAction}
                    aria-label={`Delete ${formatName(
                      match.teams?.teamA?.name,
                    )} versus ${formatName(
                      match.teams?.teamB?.name,
                    )} from this device`}
                    onClick={(event) => requestRemoveLocal(event, match)}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "COMPLETED" && (
        <section aria-label="Completed matches">
          <div className={styles.filters}>
            <label>
              <span>Team</span>

              <select
                value={filters.team}
                onChange={(event) =>
                  dispatch({
                    type: "TEAM",
                    value: event.target.value,
                  })
                }
              >
                <option value="ALL">All teams</option>

                {teamOptions.map((team) => (
                  <option key={team} value={team}>
                    {formatName(team)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Result</span>

              <select
                value={filters.result}
                disabled={filters.team === "ALL"}
                onChange={(event) =>
                  dispatch({
                    type: "RESULT",
                    value: event.target.value,
                  })
                }
              >
                <option value="ALL">All</option>

                <option value="WON">Won</option>

                <option value="LOST">Lost</option>

                <option value="DRAW">Draw / Tie</option>
              </select>
            </label>

            <label>
              <span>Order</span>

              <select
                value={filters.sortOrder}
                onChange={(event) =>
                  dispatch({
                    type: "SORT",
                    value: event.target.value,
                  })
                }
              >
                <option value="NEWEST">Newest</option>

                <option value="OLDEST">Oldest</option>
              </select>
            </label>
          </div>

          {pendingMatches.length > 0 && (
            <div className={styles.pendingSection}>
              <div className={styles.sectionLabel}>Saved on this device</div>

              <div className={styles.list}>
                {pendingMatches.map((match) => (
                  <PendingMatchCard
                    key={match.id}
                    match={match}
                    onOpen={() => openLocalMatch(match)}
                  />
                ))}
              </div>
            </div>
          )}

          {serverQuery.isLoading ? (
            <LoadingState label="Loading completed matches…" />
          ) : serverQuery.isError ? (
            <ErrorBlock
              message="Completed matches could not be loaded from the server."
              onRetry={serverQuery.refetch}
            />
          ) : visibleCompleted.length === 0 && pendingMatches.length === 0 ? (
            <EmptyState
              title="No completed matches"
              subtitle={
                filters.team === "ALL"
                  ? "Finished matches will appear here."
                  : "Try a different filter."
              }
            />
          ) : (
            <div className={styles.list}>
              {visibleCompleted.map((match) => {
                const format = getServerMatchFormat(match);

                const isTest = format === "TEST";

                return (
                  <button
                    type="button"
                    key={match.id}
                    className={styles.completedCard}
                    onClick={() =>
                      navigate(`/season/${seasonId}/match/${match.id}`)
                    }
                  >
                    <span className={styles.dateRow}>
                      <span className={styles.date}>
                        {formatDateTime(match.completedAt || match.createdAt)}
                      </span>

                      <span className={styles.formatBadge}>
                        {formatMatchBadge(match, format)}
                      </span>
                    </span>

                    <ScoreRow
                      name={match.teamA}
                      score={match.teamAScore}
                      wickets={match.teamAWickets}
                      balls={match.teamABallsFaced}
                      innings={match.teamAInnings}
                      isTest={isTest}
                      winner={sameName(match.winner, match.teamA)}
                    />

                    <ScoreRow
                      name={match.teamB}
                      score={match.teamBScore}
                      wickets={match.teamBWickets}
                      balls={match.teamBBallsFaced}
                      innings={match.teamBInnings}
                      isTest={isTest}
                      winner={sameName(match.winner, match.teamB)}
                    />

                    <span className={styles.result}>
                      {match.wonBy ||
                        (isServerDraw(match)
                          ? "Match tied/drawn"
                          : "Match complete")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      <ConfirmSheet
        open={Boolean(pendingDelete)}
        title="Delete this match?"
        description={
          pendingDelete
            ? `${formatName(pendingDelete.teams?.teamA?.name)} vs ${formatName(
                pendingDelete.teams?.teamB?.name,
              )} will be removed from this device. This can't be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={confirmRemoveLocal}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

/**
 * Format a single Test innings.
 *
 * Examples:
 *
 * 20/1 declared -> 20-1 d
 * 22 all-out    -> 22
 * 35/0 declared -> 35-0 d
 * 9/0 chasing   -> 9-0
 * follow-on     -> 30 f/o
 */
const formatTestInnings = (innings) => {
  const runs = Number(innings?.runs || 0);

  const wickets = Number(innings?.wickets || 0);

  const completionReason = innings?.completionReason;

  /**
   * If ALL_OUT we don't need
   * "-10".
   *
   * Example:
   *
   * 22 all-out -> 22
   *
   * instead of:
   *
   * 22-10
   */
  const score =
    completionReason === "ALL_OUT" ? `${runs}` : `${runs}-${wickets}`;

  const declared = completionReason === "DECLARED" ? " d" : "";

  /**
   * Backend API field:
   *
   * followOn
   *
   * isFollowOn is retained only
   * for old/local payload compatibility.
   */
  const followOn =
    innings?.followOn === true || innings?.isFollowOn === true ? " f/o" : "";

  return `${score}${declared}${followOn}`;
};

/**
 * Test match API contains separate innings:
 *
 * teamAInnings: [
 *   innings 1,
 *   innings 2
 * ]
 *
 * Therefore NEVER use teamAScore/teamBScore
 * for Test card score presentation.
 *
 * Example:
 *
 * Spider
 * 20-1 d & 22
 */
const inningsToDisplay = (innings) =>
  (Array.isArray(innings) ? innings : [])
    .slice()
    .sort(
      (a, b) => Number(a?.inningsNumber || 0) - Number(b?.inningsNumber || 0),
    )
    .map(formatTestInnings)
    .join(" & ");

function ScoreRow({ name, score, wickets, balls, innings, isTest, winner }) {
  const hasTestInnings = isTest && Array.isArray(innings) && innings.length > 0;

  return (
    <span className={`${styles.scoreRow} ${winner ? styles.winner : ""}`}>
      <span>{formatName(name)}</span>

      <strong>
        {hasTestInnings
          ? inningsToDisplay(innings)
          : score == null
            ? "—"
            : `${score}-${wickets ?? 0} (${ballsToOvers(balls)})`}
      </strong>
    </span>
  );
}

function PendingMatchCard({ match, onOpen }) {
  const first = match.innings?.[0];

  const second = match.innings?.[1];

  const failed = match.syncStatus === "failed";

  return (
    <button
      type="button"
      className={`${styles.completedCard} ${styles.pendingCard}`}
      onClick={onOpen}
    >
      <span className={styles.pendingTop}>
        <strong>
          {formatName(match.teams?.teamA?.name)}{" "}
          <span className={styles.vs}>vs</span>{" "}
          {formatName(match.teams?.teamB?.name)}
        </strong>

        <span
          className={`${styles.statusPill} ${
            failed ? styles.failedPill : styles.pendingPill
          }`}
        >
          {failed ? "SYNC FAILED" : "PENDING"}
        </span>
      </span>

      {first && (
        <span className={styles.localScore}>
          {formatName(first.battingTeam)} · {scoreLine(first)}
        </span>
      )}

      {second && (
        <span className={styles.localScore}>
          {formatName(second.battingTeam)} · {scoreLine(second)}
        </span>
      )}

      <span className={styles.pendingHint}>
        {failed
          ? "Saved locally. Use the header sync button when online."
          : "Saved locally and waiting for backend confirmation."}
      </span>
    </button>
  );
}

function ErrorBlock({ message, onRetry }) {
  return (
    <div className={styles.errorBlock} role="alert">
      <strong>{message}</strong>

      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
