import React, { useState } from "react";
import styles from "./OversTimeline.module.css";

/* =========================================================
   LABELS
========================================================= */

function getInningsLabel(innings, index) {
  if (index === 0) return "1st Inn";

  if (index === 1) return "2nd Inn";

  const soNumber = Math.floor((index - 2) / 2) + 1;

  const shortTeam = innings.battingTeam
    .slice(0, 3)
    .toUpperCase();

  return `SO${soNumber} • ${shortTeam}`;
}

function getInningsFullLabel(innings, index) {
  if (index === 0) {
    return `1st Innings — ${innings.battingTeam}`;
  }

  if (index === 1) {
    return `2nd Innings — ${innings.battingTeam}`;
  }

  const soNumber =
    Math.floor((index - 2) / 2) + 1;

  return `SO ${soNumber} • ${innings.battingTeam}`;
}

/* =========================================================
   MAIN
========================================================= */

const OversTimeline = ({ match }) => {
  const { live, innings: allInnings } = match;

  /* =====================================
     LIVE vs COMPLETED MATCH
  ===================================== */

  const visibleInnings = live
    ? allInnings.slice(
        0,
        live.inningsIndex + 1
      )
    : allInnings;

  /* =====================================
     ONLY INNINGS WITH BALL DATA
  ===================================== */

  const inningsWithData = visibleInnings
    .map((inn, idx) => ({ inn, idx }))
    .filter(
      ({ inn }) =>
        inn.ballByBall &&
        inn.ballByBall.length > 0
    );

  /* =====================================
     SELECTED INNINGS
  ===================================== */

  const [selectedIdx, setSelectedIdx] =
    useState(() => {
      // Historical match
      if (!live) {
        return inningsWithData[0]?.idx ?? 0;
      }

      // Live match
      const cur = inningsWithData.find(
        ({ idx }) =>
          idx === live.inningsIndex
      );

      return cur
        ? cur.idx
        : (inningsWithData[
            inningsWithData.length - 1
          ]?.idx ?? 0);
    });

  /* =====================================
     NO DATA
  ===================================== */

  if (inningsWithData.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>
          No over-by-over data available.
        </p>

        <span>
          This match was recorded before
          over tracking was added.
        </span>
      </div>
    );
  }

  /* =====================================
     SAFE INDEX
  ===================================== */

  const safeIdx = inningsWithData.find(
    ({ idx }) => idx === selectedIdx
  )
    ? selectedIdx
    : inningsWithData[
        inningsWithData.length - 1
      ].idx;

  const currentInnings =
    allInnings[safeIdx];

  return (
    <div className={styles.wrapper}>
      {/* INNINGS TABS */}

      {inningsWithData.length > 1 && (
        <div className={styles.inningsTabs}>
          {inningsWithData.map(
            ({ inn, idx }) => (
              <button
                key={idx}
                className={`${
                  styles.inningsTab
                } ${
                  safeIdx === idx
                    ? styles.inningsTabActive
                    : ""
                } ${
                  idx >= 2
                    ? styles.inningsTabSO
                    : ""
                }`}
                onClick={() =>
                  setSelectedIdx(idx)
                }
              >
                {getInningsLabel(
                  inn,
                  idx
                )}
              </button>
            )
          )}
        </div>
      )}

      {/* TITLE */}

      <div className={styles.inningsTitle}>
        {getInningsFullLabel(
          currentInnings,
          safeIdx
        )}

        <span
          className={styles.inningsSummary}
        >
          {currentInnings.totalRuns}-
          {currentInnings.wickets}
          {" ("}
          {Math.floor(
            currentInnings.balls / 6
          )}
          .
          {currentInnings.balls % 6}
          {" ov)"}
        </span>
      </div>

      {/* TIMELINE */}

      <InningsTimeline
        innings={currentInnings}
      />
    </div>
  );
};

/* =========================================================
   INNINGS TIMELINE
========================================================= */

function InningsTimeline({ innings }) {
  if (
    !innings.ballByBall ||
    innings.ballByBall.length === 0
  ) {
    return (
      <div className={styles.emptyState}>
        <p>
          No over-by-over data available.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.emptyState}>
      <p>
        Timeline available for newer matches
        only.
      </p>
    </div>
  );
}

export default OversTimeline;