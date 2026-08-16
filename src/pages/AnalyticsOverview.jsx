import { useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { LeaderboardState } from "../features/stats/components/LeaderboardView";
import { useBattingLeaderboard, useBowlingLeaderboard } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./AnalyticsOverview.module.css";

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const decimal = (value) => number(value).toFixed(2);

function LeaderCard({ rank, name, primary, secondary, onOpen }) {
  return (
    <button type="button" className={styles.leaderCard} onClick={onOpen}>
      <span className={styles.rank} aria-label={`Rank ${rank}`}>{rank}</span>
      <span className={styles.playerName}>{formatName(name)}</span>
      <strong className={styles.primaryValue}>{primary}</strong>
      <span className={styles.secondaryValue}>{secondary}</span>
    </button>
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

  const loading = battingQuery.isLoading || bowlingQuery.isLoading;
  const error = battingQuery.error || bowlingQuery.error;
  const empty = !loading && topBatters.length === 0 && topBowlers.length === 0;

  return (
    <div className={styles.page}>
      <LeaderboardState
        loading={loading}
        fetching={(battingQuery.isFetching || bowlingQuery.isFetching) && !loading}
        error={error}
        empty={empty}
        onRetry={() => { battingQuery.refetch(); bowlingQuery.refetch(); }}
        emptyTitle="No analytics yet"
        emptySubtitle="Complete a match to start building batting and bowling insights."
      >
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Batting</span>
              <h2>Leading run scorers</h2>
            </div>
            <button type="button" className={styles.textAction} onClick={() => navigate("../batting")}>View all</button>
          </div>
          <div className={styles.cards}>
            {topBatters.map((player, index) => (
              <LeaderCard
                key={player.playerId || player.playerName}
                rank={index + 1}
                name={player.playerName}
                primary={`${number(player.totalRuns)} runs`}
                secondary={`${number(player.inningsPlayed)} innings · ${decimal(player.strikeRate)} SR`}
                onOpen={() => navigate(`/player/${encodeURIComponent(player.playerId)}`)}
              />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Bowling</span>
              <h2>Top wicket takers</h2>
            </div>
            <button type="button" className={styles.textAction} onClick={() => navigate("../bowling")}>View all</button>
          </div>
          <div className={styles.cards}>
            {topBowlers.map((player, index) => (
              <LeaderCard
                key={player.playerId || player.playerName}
                rank={index + 1}
                name={player.playerName}
                primary={`${number(player.totalWickets)} wickets`}
                secondary={`${decimal(player.economyRate)} economy · ${number(player.totalWickets) === 0 ? "—" : decimal(player.average)} avg`}
                onOpen={() => navigate(`/player/${encodeURIComponent(player.playerId)}`)}
              />
            ))}
          </div>
        </section>
      </LeaderboardState>
    </div>
  );
}
