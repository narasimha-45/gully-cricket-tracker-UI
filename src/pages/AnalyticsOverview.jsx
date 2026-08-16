import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { StatsSkeleton } from "../features/stats/components/LeaderboardView";
import { useBattingLeaderboard, useBowlingLeaderboard } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./AnalyticsOverview.module.css";

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const decimal = (value) => number(value).toFixed(2);
const initial = (name) => (name || "?").trim().charAt(0).toUpperCase();

// Rank 2/3 get a distinct silver/bronze badge instead of the flat "same
// circle for every row" treatment the old list used — rank 1 is spotlighted
// separately below and doesn't use this.
const RANK_TIER_CLASS = { 2: "rankSilver", 3: "rankBronze" };

function SpotlightRow({ player, unit, primaryValue, secondaryValue, onOpen }) {
  return (
    <button
      type="button"
      className={styles.spotlight}
      onClick={() => onOpen(player)}
    >
      <span className={styles.spotlightAvatar} aria-hidden="true">
        {initial(player.playerName)}
      </span>
      <span className={styles.spotlightCopy}>
        <span className={styles.spotlightRankLabel}>Leading {unit}</span>
        <strong className={styles.spotlightName}>
          {formatName(player.playerName)}
        </strong>
        <span className={styles.spotlightSecondary}>
          {secondaryValue(player)}
        </span>
      </span>
      <span className={styles.spotlightValue}>{primaryValue(player)}</span>
    </button>
  );
}

function CompactRow({ player, rank, primaryValue, secondaryValue, onOpen }) {
  return (
    <button
      type="button"
      className={styles.compactRow}
      onClick={() => onOpen(player)}
    >
      <span
        className={`${styles.rankBadge} ${styles[RANK_TIER_CLASS[rank]] || ""}`}
        aria-label={`Rank ${rank}`}
      >
        {rank}
      </span>
      <span className={styles.compactCopy}>
        <strong className={styles.compactName}>
          {formatName(player.playerName)}
        </strong>
        <span className={styles.compactSecondary}>
          {secondaryValue(player)}
        </span>
      </span>
      <span className={styles.compactValue}>{primaryValue(player)}</span>
    </button>
  );
}

function PerformancePanel({
  eyebrow,
  title,
  unit,
  items,
  loading,
  fetching,
  error,
  onRetry,
  onViewAll,
  primaryValue,
  secondaryValue,
  onOpenPlayer,
}) {
  const empty = !loading && items.length === 0;
  const [leader, ...rest] = items;

  return (
    <section className={styles.section} aria-busy={Boolean(fetching)}>
      <div className={styles.sectionHeading}>
        <div className={styles.titleGroup}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <button type="button" className={styles.textAction} onClick={onViewAll}>
          View all
        </button>
      </div>

      <div className={styles.panel}>
        {loading ? (
          <StatsSkeleton rows={3} compact />
        ) : error && empty ? (
          <div className={styles.panelMessage} role="alert">
            <div>
              <strong>Couldn’t load {eyebrow.toLowerCase()} stats</strong>
              <span>Try again without leaving this page.</span>
            </div>
            <button type="button" onClick={onRetry}>
              <RefreshCw size={15} /> Retry
            </button>
          </div>
        ) : empty ? (
          <div className={styles.panelMessage}>
            <div>
              <strong>No {eyebrow.toLowerCase()} stats yet</strong>
              <span>Complete a match to start the leaderboard.</span>
            </div>
          </div>
        ) : (
          <>
            <SpotlightRow
              player={leader}
              unit={unit}
              primaryValue={primaryValue}
              secondaryValue={secondaryValue}
              onOpen={onOpenPlayer}
            />
            {rest.length > 0 && (
              <div className={styles.compactList}>
                {rest.map((player, index) => (
                  <CompactRow
                    key={player.playerId || player.playerName}
                    player={player}
                    rank={index + 2}
                    primaryValue={primaryValue}
                    secondaryValue={secondaryValue}
                    onOpen={onOpenPlayer}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default function AnalyticsOverview() {
  const { globalFilter = "all" } = useOutletContext() || {};
  const navigate = useNavigate();
  const seasonId = globalFilter !== "all" ? globalFilter : undefined;

  const battingQuery = useBattingLeaderboard({ seasonId });
  const bowlingQuery = useBowlingLeaderboard({ seasonId });

  const topBatters = useMemo(
    () =>
      [...(battingQuery.data || [])]
        .sort((a, b) => number(b.totalRuns) - number(a.totalRuns))
        .slice(0, 3),
    [battingQuery.data],
  );

  const topBowlers = useMemo(
    () =>
      [...(bowlingQuery.data || [])]
        .sort((a, b) => number(b.totalWickets) - number(a.totalWickets))
        .slice(0, 3),
    [bowlingQuery.data],
  );

  const trackedBatters = battingQuery.data?.length || 0;
  const trackedBowlers = bowlingQuery.data?.length || 0;

  const openPlayer = (player) => {
    if (!player.playerId) return;
    navigate(`/player/${encodeURIComponent(player.playerId)}`);
  };

  return (
    <div className={styles.page}>
      {(trackedBatters > 0 || trackedBowlers > 0) && (
        <div className={styles.summaryStrip} aria-label="Tracked player counts">
          <span>
            <strong>{trackedBatters}</strong> run scorers
          </span>
          <span className={styles.summaryDivider} aria-hidden="true" />
          <span>
            <strong>{trackedBowlers}</strong> wicket takers
          </span>
        </div>
      )}

      <PerformancePanel
        eyebrow="Batting"
        title="Leading run scorers"
        unit="run scorer"
        items={topBatters}
        loading={battingQuery.isLoading}
        fetching={battingQuery.isFetching && !battingQuery.isLoading}
        error={battingQuery.error}
        onRetry={battingQuery.refetch}
        onViewAll={() => navigate("../batting")}
        primaryValue={(player) => (
          <>
            <strong>{number(player.totalRuns)}</strong>
            <span>runs</span>
          </>
        )}
        secondaryValue={(player) =>
          `${number(player.inningsPlayed)} innings · ${decimal(player.strikeRate)} SR`
        }
        onOpenPlayer={openPlayer}
      />

      <PerformancePanel
        eyebrow="Bowling"
        title="Top wicket takers"
        unit="wicket taker"
        items={topBowlers}
        loading={bowlingQuery.isLoading}
        fetching={bowlingQuery.isFetching && !bowlingQuery.isLoading}
        error={bowlingQuery.error}
        onRetry={bowlingQuery.refetch}
        onViewAll={() => navigate("../bowling")}
        primaryValue={(player) => (
          <>
            <strong>{number(player.totalWickets)}</strong>
            <span>wickets</span>
          </>
        )}
        secondaryValue={(player) =>
          `${decimal(player.economyRate)} economy · ${number(player.totalWickets) === 0 || player.average == null ? "—" : decimal(player.average)} avg`
        }
        onOpenPlayer={openPlayer}
      />
    </div>
  );
}
