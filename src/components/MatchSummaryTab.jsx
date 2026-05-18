import { formatName } from "../utils/helpers";
import styles from "./MatchSummaryTab.module.css";

function formatOvers(balls = 0) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

/* =========================================================
   TOP BATTERS
========================================================= */

function getTopBatters(innings) {
  if (!innings?.battingStats) return [];

  const batting = Array.isArray(innings.battingStats)
    ? innings.battingStats
    : Object.entries(innings.battingStats).map(
        ([name, stats]) => ({
          name,
          ...stats,
        })
      );

  return batting
    .filter((p) => p.balls > 0)
    .sort((a, b) => {
      if (b.runs !== a.runs) {
        return b.runs - a.runs;
      }

      const aSR =
        a.balls > 0 ? (a.runs / a.balls) * 100 : 0;

      const bSR =
        b.balls > 0 ? (b.runs / b.balls) * 100 : 0;

      return bSR - aSR;
    })
    .slice(0, 2);
}

/* =========================================================
   TOP BOWLERS
========================================================= */

function getTopBowlers(innings) {
  if (!innings?.bowlingStats) return [];

  const bowling = Array.isArray(innings.bowlingStats)
    ? innings.bowlingStats
    : Object.entries(innings.bowlingStats).map(
        ([name, stats]) => ({
          name,
          ...stats,
        })
      );

  return bowling
    .filter((p) => p.balls > 0)
    .sort((a, b) => {
      if (b.wickets !== a.wickets) {
        return b.wickets - a.wickets;
      }

      const aEco =
        a.balls > 0 ? a.runs / (a.balls / 6) : 999;

      const bEco =
        b.balls > 0 ? b.runs / (b.balls / 6) : 999;

      return aEco - bEco;
    })
    .slice(0, 2);
}

/* =========================================================
   COMPONENT
========================================================= */

export default function MatchSummaryTab({ match }) {
  return (
    <div className={styles.summaryWrapper}>
      {match.innings.map((innings, index) => {
        const topBatters = getTopBatters(innings);

        const topBowlers = getTopBowlers(innings);

        const inningsLabel =
          index === 0
            ? "1st Innings"
            : index === 1
            ? "2nd Innings"
            : `Super Over ${Math.floor((index - 2) / 2) + 1}`;

        return (
          <div
            key={index}
            className={styles.summarySection}
          >
            {/* HEADER */}

            <div className={styles.summaryHeaderRow}>
              <div>
                <div className={styles.summaryHeading}>
                  {inningsLabel} • {innings.battingTeam}
                </div>
              </div>

              <div className={styles.summaryScore}>
                {innings.totalRuns}/{innings.wickets}

                <div className={styles.summaryOvers}>
                  ({formatOvers(innings.balls)} ov)
                </div>
              </div>
            </div>

            {/* STATS */}

            <div className={styles.summaryStatsGrid}>
              {/* BATTERS */}

              <div>
                <div className={styles.summaryMiniTitle}>
                  Batting
                </div>

                {topBatters.map((player, idx) => (
                  <div
                    key={idx}
                    className={styles.summaryCompactRow}
                  >
                    <span
                      className={styles.summaryCompactName}
                    >
                      {formatName(player.name)}
                    </span>

                    <span
                      className={styles.summaryCompactValue}
                    >
                      {player.runs} ({player.balls})
                    </span>
                  </div>
                ))}
              </div>

              {/* BOWLERS */}

              <div>
                <div className={styles.summaryMiniTitle}>
                  Bowling
                </div>

                {topBowlers.map((player, idx) => (
                  <div
                    key={idx}
                    className={styles.summaryCompactRow}
                  >
                    <span
                      className={styles.summaryCompactName}
                    >
                      {formatName(player.name)}
                    </span>

                    <span
                      className={styles.summaryCompactValue}
                    >
                      {player.wickets}/{player.runs}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}