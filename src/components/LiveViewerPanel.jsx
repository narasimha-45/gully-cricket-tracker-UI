import { useMemo } from "react";
import { useMatchSession } from "../features/match/state/useMatchSession";
import { selectCurrentInnings } from "../features/match/state/matchSelectors";
import { formatName } from "../utils/helpers";
import { getBallPresentation } from "../utils/matchPresentation";
import { getCurrentPartnership } from "../utils/partnerships";
import { renderBatStats, renderBowlStats } from "../utils/renderStats";
import styles from "./LiveScoringPanel.module.css";
import viewerStyles from "./LiveViewerPanel.module.css";

export default function LiveViewerPanel() {
  const { match, liveConnectionState } = useMatchSession();
  const innings = useMemo(() => selectCurrentInnings(match), [match]);
  const live = match.live || {};
  const partnership = getCurrentPartnership(innings);

  return (
    <>
      <div className={viewerStyles.viewerBanner} role="status">
        <span className={viewerStyles.viewerDot} aria-hidden="true" />
        <div>
          <strong>Live view</strong>
          <span>
            {liveConnectionState === "connected"
              ? "Updates arrive automatically"
              : "Reconnecting to live score…"}
          </span>
        </div>
      </div>

      <section className={styles.card} aria-label="Current batters">
        <div className={styles.tableHeader}>
          <span>Batter</span>
          <span>R</span>
          <span>B</span>
          <span>4s</span>
          <span>6s</span>
        </div>
        {[live.striker, live.nonStriker].map((name, index) => (
          <div
            key={index === 0 ? "striker" : "non-striker"}
            className={styles.tableRow}
          >
            <span className={styles.playerName}>
              {name
                ? `${formatName(name)}${index === 0 ? " *" : ""}`
                : "Waiting for batter"}
            </span>
            {renderBatStats(innings, name)}
          </div>
        ))}
      </section>

      {live.striker && live.nonStriker && (
        <section className={styles.partnershipCard} aria-label="Current partnership">
          <span className={styles.partnershipLabel}>Partnership</span>
          <div className={styles.partnershipMain}>
            <span className={styles.partnershipRuns}>
              {partnership?.runs ?? 0}
              <span className={styles.partnershipBalls}>
                {` (${partnership?.balls ?? 0})`}
              </span>
            </span>
            <div className={styles.partnershipBatters}>
              {partnership
                ? Object.entries(partnership.contributions).map(
                    ([name, contribution]) => (
                      <span key={name} className={styles.partnershipBatter}>
                        {formatName(name)}: {contribution.runs} ({contribution.balls})
                      </span>
                    ),
                  )
                : null}
            </div>
          </div>
        </section>
      )}

      <section className={styles.card} aria-label="Current bowler">
        <div className={styles.tableHeader}>
          <span>Bowler</span>
          <span>O</span>
          <span>M</span>
          <span>R</span>
          <span>W</span>
        </div>
        <div className={styles.tableRow}>
          <span className={styles.playerName}>
            {live.bowler ? `${formatName(live.bowler)} *` : "Waiting for bowler"}
          </span>
          {renderBowlStats(innings, live.bowler)}
        </div>
      </section>

      <section className={styles.overBox} aria-label="Current over">
        <p className={styles.overLabel}>This over</p>
        <div className={styles.overBalls}>
          {(innings.thisOver || []).length === 0 && (
            <span className={styles.emptyOver}>No balls yet</span>
          )}
          {(innings.thisOver || []).map((ball, index) => {
            const presentation = getBallPresentation(ball, match);
            const isLatest = index === (innings.thisOver || []).length - 1;
            return (
              <span
                key={index}
                className={`${styles.ballChip} ${styles[presentation.kind]} ${isLatest ? styles.ballChipEnter : ""}`}
              >
                {presentation.label}
              </span>
            );
          })}
        </div>
      </section>
    </>
  );
}
