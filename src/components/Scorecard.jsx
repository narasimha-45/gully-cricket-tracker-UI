import { formatName } from "../utils/helpers";
import { getTeamInningsOrdinal, isTestMatch } from "../utils/matchModel";
import InningsCard from "./scorecard/InningsCard";
import {
  hasInningsStarted,
  inningsKey,
  ordinalLabel,
  toPairs,
} from "./scorecard/scorecardUtils";
import styles from "./Scorecard.module.css";

export default function Scorecard({ match }) {
  const { innings: allInnings = [], teams, live } = match ?? {};

  if (!teams?.teamA || !teams?.teamB) {
    return (
      <EmptyScorecard message="Scorecard is unavailable for this match." />
    );
  }

  const visibleInnings =
    Number.isInteger(live?.inningsIndex) && live.inningsIndex >= 0
      ? allInnings.slice(0, live.inningsIndex + 1)
      : allInnings;

  if (!visibleInnings.some(hasInningsStarted)) {
    return (
      <EmptyScorecard message="Scorecard will appear after the first ball." />
    );
  }

  const testMatch = isTestMatch(match);
  const mainInnings = testMatch
    ? visibleInnings.filter((innings) => !innings.isSuperOver)
    : visibleInnings.slice(0, 2);
  const superOverInnings = testMatch ? [] : visibleInnings.slice(2);

  return (
    <section className={styles.page} aria-label="Match scorecard">
      {mainInnings.map((innings, index) => (
        <InningsCard
          key={inningsKey(innings, index)}
          innings={innings}
          teams={teams}
          tone="primary"
          label={
            testMatch
              ? `${formatName(innings.battingTeam)} · ${ordinalLabel(
                  getTeamInningsOrdinal(match, index),
                )} innings`
              : `Innings ${index + 1} · ${formatName(innings.battingTeam)}`
          }
        />
      ))}

      {toPairs(superOverInnings).map((group, groupIndex) => (
        <section
          className={styles.superOverSection}
          key={`super-over-${groupIndex + 1}`}
          aria-labelledby={`super-over-${groupIndex + 1}-title`}
        >
          <h3
            id={`super-over-${groupIndex + 1}-title`}
            className={styles.superOverHeading}
          >
            Super Over {groupIndex + 1}
          </h3>
          <div className={styles.superOverCards}>
            {group.map((innings, inningsIndex) => (
              <InningsCard
                key={inningsKey(innings, inningsIndex)}
                innings={innings}
                teams={teams}
                tone="danger"
                label={formatName(innings.battingTeam)}
              />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

function EmptyScorecard({ message }) {
  return (
    <div className={styles.empty} role="status">
      <h3>Match not started</h3>
      <p>{message}</p>
    </div>
  );
}
