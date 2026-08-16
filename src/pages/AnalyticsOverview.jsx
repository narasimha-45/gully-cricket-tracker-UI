import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { StatsSkeleton } from "../features/stats/components/LeaderboardView";
import { useBattingLeaderboard, useBowlingLeaderboard } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./AnalyticsOverview.module.css";

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const decimal = (value) => number(value).toFixed(2);

function PerformancePanel({
  eyebrow,
  title,
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

  return (
    <section className={styles.section} aria-busy={Boolean(fetching)}>
      <div className={styles.sectionHeading}>
        <div className={styles.titleGroup}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <button type="button" className={styles.textAction} onClick={onViewAll}>View all</button>
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
            <button type="button" onClick={onRetry}><RefreshCw size={15} /> Retry</button>
          </div>
        ) : empty ? (
          <div className={styles.panelMessage}>
            <div>
              <strong>No {eyebrow.toLowerCase()} stats yet</strong>
              <span>Complete a match to start the leaderboard.</span>
            </div>
          </div>
        ) : (
          <div className={styles.leaderList}>
            {items.map((player, index) => (
              <button
                type="button"
                className={styles.leaderRow}
                key={player.playerId || player.playerName}
                onClick={() => onOpenPlayer(player)}
              >
                <span className={styles.rank} aria-label={`Rank ${index + 1}`}>{index + 1}</span>
                <span className={styles.playerCopy}>
                  <strong className={styles.playerName}>{formatName(player.playerName)}</strong>
                  <span className={styles.secondaryValue}>{secondaryValue(player)}</span>
                </span>
                <span className={styles.primaryValue}>{primaryValue(player)}</span>
              </button>
            ))}
          </div>
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

  const topBatters = useMemo(() =>
    [...(battingQuery.data || [])]
      .sort((a, b) => number(b.totalRuns) - number(a.totalRuns))
      .slice(0, 3), [battingQuery.data]);

  const topBowlers = useMemo(() =>
    [...(bowlingQuery.data || [])]
      .sort((a, b) => number(b.totalWickets) - number(a.totalWickets))
      .slice(0, 3), [bowlingQuery.data]);

  const openPlayer = (player) => {
    if (!player.playerId) return;
    navigate(`/player/${encodeURIComponent(player.playerId)}`);
  };

  return (
    <div className={styles.page}>
      <PerformancePanel
        eyebrow="Batting"
        title="Leading run scorers"
        items={topBatters}
        loading={battingQuery.isLoading}
        fetching={battingQuery.isFetching && !battingQuery.isLoading}
        error={battingQuery.error}
        onRetry={battingQuery.refetch}
        onViewAll={() => navigate("../batting")}
        primaryValue={(player) => <><strong>{number(player.totalRuns)}</strong><span>runs</span></>}
        secondaryValue={(player) => `${number(player.inningsPlayed)} innings · ${decimal(player.strikeRate)} SR`}
        onOpenPlayer={openPlayer}
      />

      <PerformancePanel
        eyebrow="Bowling"
        title="Top wicket takers"
        items={topBowlers}
        loading={bowlingQuery.isLoading}
        fetching={bowlingQuery.isFetching && !bowlingQuery.isLoading}
        error={bowlingQuery.error}
        onRetry={bowlingQuery.refetch}
        onViewAll={() => navigate("../bowling")}
        primaryValue={(player) => <><strong>{number(player.totalWickets)}</strong><span>wickets</span></>}
        secondaryValue={(player) => `${decimal(player.economyRate)} economy · ${number(player.totalWickets) === 0 || player.average == null ? "—" : decimal(player.average)} avg`}
        onOpenPlayer={openPlayer}
      />
    </div>
  );
}
