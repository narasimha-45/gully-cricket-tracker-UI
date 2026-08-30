import { formatOvers } from "../utils/calculators";
import { formatName } from "../utils/helpers";
import { isTestMatch, getTestInningsPerTeam } from "../utils/matchModel";
import {
  buildMatchHeroRows,
  buildMatchStatusLine,
} from "../utils/matchPresentation";
import styles from "./MatchHero.module.css";

const formatInningsScore = (innings) =>
  innings
    ? `${innings.totalRuns}-${innings.wickets} (${formatOvers(
        innings.balls,
      )})${innings.completionReason === "DECLARED" ? " d" : ""}`
    : null;

// Renders one team's score for a test-match row: completed innings are joined
// with " & " in a muted, smaller weight; the live innings (if any) is bold and
// slightly larger so the eye lands on what's actually happening right now.
function TestScoreSegments({ segments }) {
  if (segments.length === 0) {
    return <span className={styles.yetToBat}>Yet to bat</span>;
  }

  return segments.map((segment, index) => (
    <span key={index}>
      {index > 0 && <span className={styles.segmentSeparator}> & </span>}
      <span
        // Keying on the score forces a remount when it changes, replaying the
        // pop animation below as a lightweight "just updated" cue.
        key={
          segment.isCurrent
            ? `${segment.innings.totalRuns}-${segment.innings.wickets}-${segment.innings.balls}`
            : undefined
        }
        className={
          segment.isCurrent
            ? `${styles.segmentLive} ${styles.scoreValuePulse}`
            : styles.segmentDone
        }
      >
        {formatInningsScore(segment.innings)}
      </span>
    </span>
  ));
}

export default function MatchHero({ match, onAction }) {
  const rows = buildMatchHeroRows(match);
  const status = buildMatchStatusLine(match);
  const completed = match.status === "COMPLETED";
  const testMatch = isTestMatch(match);

  let previousWasRow = false;

  return (
    <section className={styles.card}>
      <div className={styles.top}>
        <div className={styles.titleRow}>
          <span className={styles.liveBadge}>
            ● {completed ? "END" : "LIVE"}
          </span>
          <h1 className={styles.title}>
            {formatName(match.teams.teamA.name)} vs{" "}
            {formatName(match.teams.teamB.name)}
          </h1>
          <span className={styles.formatPill}>
            {testMatch
              ? `Test · ${getTestInningsPerTeam(match)} inn/team`
              : `${match.totalOvers} Ov`}
          </span>
        </div>

        <button
          type="button"
          className={styles.actionButton}
          aria-label={completed ? "Recreate match" : "Edit match"}
          onClick={onAction}
        >
          {completed ? "↻" : "✎"}
        </button>
      </div>

      <div className={styles.rows}>
        {rows.map((row) => {
          if (row.isSectionLabel) {
            previousWasRow = false;
            return (
              <div key={row.key} className={styles.sectionDivider}>
                <span className={styles.sectionLine} />
                <span className={styles.sectionLabel}>{row.label}</span>
                <span className={styles.sectionLine} />
              </div>
            );
          }

          const showSeparator = previousWasRow;
          previousWasRow = true;

          return (
            <div key={row.key}>
              {showSeparator && <div className={styles.rowSeparator} />}
              <div className={styles.teamRow}>
                <span
                  className={`${
                    row.isCurrent
                      ? styles.teamNameCurrent
                      : styles.teamNameMuted
                  } ${row.isSuperOver ? styles.superOverTeam : ""}`}
                >
                  {row.label}
                </span>
                <span className={styles.scoreValue}>
                  {row.segments ? (
                    <TestScoreSegments segments={row.segments} />
                  ) : row.innings ? (
                    <span
                      key={`${row.innings.totalRuns}-${row.innings.wickets}-${row.innings.balls}`}
                      className={
                        row.isCurrent
                          ? `${styles.segmentLive} ${styles.scoreValuePulse}`
                          : styles.segmentDone
                      }
                    >
                      {formatInningsScore(row.innings)}
                    </span>
                  ) : (
                    <span className={styles.yetToBat}>Yet to bat</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.statusFooter}>
        {status.type === "text" && (
          <div className={styles.resultText}>{status.text}</div>
        )}

        {status.type === "crr" && (
          <div className={styles.statusCenter}>
            <span>CRR: {status.crr}</span>
          </div>
        )}

        {(status.type === "test" || status.type === "inningsInfo") && (
          <div className={styles.testStatusLine}>
            <span>{status.text}</span>
            <span>CRR: {status.crr}</span>
          </div>
        )}

        {status.type === "chase" && (
          <>
            <div className={styles.statusRow}>
              <span>CRR: {status.crr}</span>
              <span>RRR: {status.rrr}</span>
            </div>
            <div className={styles.statusCenter}>
              <span>
                Need {status.need} in {status.ballsLeft} balls
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
