import { formatOvers } from "../utils/calculators";
import { formatName } from "../utils/helpers";
import { getTestInningsPerTeam, isTestMatch } from "../utils/matchModel";
import {
  buildMatchHeroRows,
  buildMatchStatusLine,
} from "../utils/matchPresentation";
import styles from "./MatchHero.module.css";

export default function MatchHero({ match, onAction }) {
  const rows = buildMatchHeroRows(match);
  const status = buildMatchStatusLine(match);
  const completed = match.status === "COMPLETED";
  const testMatch = isTestMatch(match);

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

      <div className={styles.scoreRows}>
        {rows.map((row) => {
          if (row.isSectionLabel) {
            return (
              <div key={row.key} className={styles.sectionDivider}>
                <span className={styles.sectionLine} />
                <span className={styles.sectionLabel}>{row.label}</span>
                <span className={styles.sectionLine} />
              </div>
            );
          }

          return (
            <div
              key={row.key}
              className={`${styles.scoreRow} ${
                row.isCurrent ? styles.current : ""
              } ${row.isFuture ? styles.future : ""}`}
            >
              <span className={row.isSuperOver ? styles.superOverTeam : ""}>
                {row.label}
              </span>
              <span className={styles.scoreValue}>
                {row.innings ? (
                  `${row.innings.totalRuns}-${row.innings.wickets} (${formatOvers(
                    row.innings.balls,
                  )})${row.innings.completionReason === "DECLARED" ? " d" : ""}`
                ) : (
                  <span className={styles.yetToBat}>Yet to bat</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.status}>
        {status.type === "text" && (
          <div className={styles.resultText}>{status.text}</div>
        )}

        {status.type === "crr" && (
          <div className={styles.statusCenter}>
            {status.isSuperOver && (
              <span className={styles.superOverBadge}>
                Super Over {status.superOverNumber}
              </span>
            )}
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
              {status.isSuperOver && (
                <span className={styles.superOverBadge}>Super Over</span>
              )}
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
