import React, { useState } from "react";
import styles from "./OversTimeline.module.css";

/* ─────────────────────────────────────────────────────────────
   Build a label for each innings tab
───────────────────────────────────────────────────────────── */
function getInningsLabel(innings, index) {
  if (index === 0) return `1st Inn`;
  if (index === 1) return `2nd Inn`;
  const soNumber = Math.floor((index - 2) / 2) + 1;
  const soLeg = (index - 2) % 2 === 0 ? "A" : "B";
  return `SO${soNumber}-${soLeg}`;
}

function getInningsFullLabel(innings, index) {
  if (index === 0) return `1st Innings — ${innings.battingTeam}`;
  if (index === 1) return `2nd Innings — ${innings.battingTeam}`;
  const soNumber = Math.floor((index - 2) / 2) + 1;
  return `Super Over ${soNumber} — ${innings.battingTeam}`;
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */
const OversTimeline = ({ match }) => {
  const { live, innings: allInnings } = match;

  // Only show innings up to the current one (respects undo)
  // Live match → only show innings till current innings
  // Older/completed match → show all innings
  const visibleInnings = live
    ? allInnings.slice(0, live.inningsIndex + 1)
    : allInnings;

  // Filter to innings that actually have ball data
  const inningsWithData = visibleInnings
    .map((inn, idx) => ({ inn, idx }))
    .filter(({ inn }) => inn.ballByBall && inn.ballByBall.length > 0);

  const [selectedIdx, setSelectedIdx] = useState(() => {
    // Default to current innings if it has data, else last with data
    const cur = live
      ? inningsWithData.find(({ idx }) => idx === live.inningsIndex)
      : null;

    return cur
      ? cur.idx
      : (inningsWithData[inningsWithData.length - 1]?.idx ?? 0);
  });

  if (inningsWithData.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No ball history yet.</p>
        <span>History starts recording from the next ball.</span>
      </div>
    );
  }

  // Make sure selectedIdx is still valid (e.g. after undo)
  const safeIdx = inningsWithData.find(({ idx }) => idx === selectedIdx)
    ? selectedIdx
    : inningsWithData[inningsWithData.length - 1].idx;

  const currentInnings = allInnings[safeIdx];

  return (
    <div className={styles.wrapper}>
      {/* ── Innings selector tabs ─────────────────────────── */}
      {inningsWithData.length > 1 && (
        <div className={styles.inningsTabs}>
          {inningsWithData.map(({ inn, idx }) => (
            <button
              key={idx}
              className={`${styles.inningsTab} ${safeIdx === idx ? styles.inningsTabActive : ""} ${idx >= 2 ? styles.inningsTabSO : ""}`}
              onClick={() => setSelectedIdx(idx)}
            >
              {getInningsLabel(inn, idx)}
            </button>
          ))}
        </div>
      )}

      {/* ── Innings title ─────────────────────────────────── */}
      <div className={styles.inningsTitle}>
        {getInningsFullLabel(currentInnings, safeIdx)}
        <span className={styles.inningsSummary}>
          {currentInnings.totalRuns}-{currentInnings.wickets} (
          {Math.floor(currentInnings.balls / 6)}.{currentInnings.balls % 6} ov)
        </span>
      </div>

      {/* ── Ball-by-ball timeline ─────────────────────────── */}
      <InningsTimeline innings={currentInnings} />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   InningsTimeline — renders one innings' over list
───────────────────────────────────────────────────────────── */
function InningsTimeline({ innings }) {
  const [expandedOver, setExpandedOver] = useState(null);

  if (!innings.ballByBall || innings.ballByBall.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No ball history for this innings.</p>
      </div>
    );
  }

  // Group balls by over
  let cumulativeRuns = 0;
  let cumulativeWickets = 0;

  const groupedOvers = innings.ballByBall.reduce((acc, ball) => {
    const overNum = ball.over;
    if (!acc[overNum]) {
      acc[overNum] = {
        overNum,
        bowler: ball.bowler,
        facingBatters: new Set(),
        balls: [],
        overRuns: 0,
        overWickets: 0,
        scoreAfterOver: "",
      };
    }

    acc[overNum].balls.push(ball);
    acc[overNum].overRuns += ball.runs;
    cumulativeRuns += ball.runs;

    if (ball.type !== "WIDE") {
      acc[overNum].facingBatters.add(ball.striker);
    }

    if (ball.isWicket) {
      acc[overNum].overWickets += 1;
      cumulativeWickets += 1;
    }

    acc[overNum].scoreAfterOver = `${cumulativeRuns}-${cumulativeWickets}`;
    return acc;
  }, {});

  const overs = Object.values(groupedOvers).reverse();

  const toggleExpand = (overNum) =>
    setExpandedOver(expandedOver === overNum ? null : overNum);

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.tableHeader}>
        <span className={styles.colOver}>Over</span>
        <span className={styles.colBalls}>Balls</span>
        <span className={styles.colRuns}>Runs</span>
      </div>

      {overs.map((over) => {
        const isExpanded = expandedOver === over.overNum;
        const battersLabel = Array.from(over.facingBatters).join(" & ");

        return (
          <div key={over.overNum} className={styles.overWrapper}>
            <div
              className={`${styles.overSummaryRow} ${isExpanded ? styles.expanded : ""}`}
              onClick={() => toggleExpand(over.overNum)}
            >
              {/* Col 1 */}
              <div className={styles.colOver}>
                <div className={styles.ovNum}>Ov {over.overNum + 1}</div>
                <div className={styles.ovScore}>{over.scoreAfterOver}</div>
              </div>

              {/* Col 2 */}
              <div className={styles.colBalls}>
                <div className={styles.ovMatchup}>
                  {over.bowler}
                  {battersLabel ? ` → ${battersLabel}` : ""}
                </div>
                <div className={styles.ovChips}>
                  {over.balls.map((ball, bIdx) => (
                    <span
                      key={bIdx}
                      className={`${styles.miniChip} ${getChipClass(ball, styles)}`}
                    >
                      {formatMiniResult(ball)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Col 3 */}
              <div className={styles.colRuns}>
                <span className={styles.ovTotalRuns}>{over.overRuns}</span>
                <span
                  className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
                >
                  ›
                </span>
              </div>
            </div>

            {isExpanded && (
              <div className={styles.detailedBalls}>
                {over.balls
                  .slice()
                  .reverse()
                  .map((ball, idx) => (
                    <div key={idx} className={styles.detailRow}>
                      <div className={styles.detailMeta}>
                        <span className={styles.detailNum}>
                          {ball.over}.{ball.ballInOver}
                        </span>
                        <span className={styles.detailText}>
                          <strong>{ball.bowler}</strong> to{" "}
                          <strong>{ball.striker}</strong>, {ball.runs}{" "}
                          {ball.runs === 1 ? "run" : "runs"}
                          {ball.type === "WIDE" && (
                            <span className={styles.extraText}> • Wide</span>
                          )}
                          {ball.type === "NO_BALL" && (
                            <span className={styles.extraText}> • No ball</span>
                          )}
                          {ball.isWicket && (
                            <span className={styles.wicketText}>
                              {" "}
                              • Wicket ({ball.wicket?.type})
                            </span>
                          )}
                        </span>
                      </div>
                      <div
                        className={`${styles.detailChip} ${getChipClass(ball, styles)}`}
                      >
                        {formatMiniResult(ball)}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const formatMiniResult = (ball) => {
  if (ball.isWicket) return "W";
  if (ball.type === "WIDE") return "Wd";
  if (ball.type === "NO_BALL") return "Nb";
  if (ball.runs === 0) return "•";
  return ball.runs;
};

const getChipClass = (ball, styles) => {
  if (ball.isWicket) return styles.wicket;
  if (ball.type === "WIDE") return styles.wide;
  if (ball.type === "NO_BALL") return styles.noBall;
  if (ball.runs === 6) return styles.six;
  if (ball.runs === 4) return styles.four;
  if (ball.runs === 0) return styles.dot;
  return styles.normal;
};

export default OversTimeline;
