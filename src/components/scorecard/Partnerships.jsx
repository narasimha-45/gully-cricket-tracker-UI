import { formatName } from "../../utils/helpers";
import styles from "../Scorecard.module.css";
import { partnershipKey } from "./scorecardUtils";

const EMPTY_STAT = { runs: 0, balls: 0 };

function ordinal(value) {
  const n = Number(value) || 0;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export default function Partnerships({ partnerships }) {
  return (
    <section
      className={styles.partnershipSection}
      aria-labelledby="partnerships-heading"
    >
      <div className={styles.partnershipSectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Innings flow</span>
          <h4 className={styles.partnershipHeading} id="partnerships-heading">
            Partnerships
          </h4>
        </div>
        <span className={styles.partnershipCount}>{partnerships.length}</span>
      </div>

      <div className={styles.partnershipList}>
        {partnerships.map((partnership, index) => (
          <PartnershipRow
            key={partnershipKey(partnership, index)}
            partnership={partnership}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

function PartnershipRow({ partnership, index }) {
  const batters = Object.keys(partnership.contributions ?? {});
  const batterOne = batters[0];
  const batterTwo = batters[1];
  const one = partnership.contributions?.[batterOne] ?? EMPTY_STAT;
  const two = batterTwo
    ? (partnership.contributions?.[batterTwo] ?? EMPTY_STAT)
    : null;
  const total = Number(partnership.runs) || 0;
  const firstPercentage =
    total === 0
      ? 50
      : Math.max(
          6,
          Math.min(94, Math.round((Number(one.runs || 0) / total) * 100)),
        );

  return (
    <article
      className={`${styles.partnershipRow} ${partnership.isActive ? styles.activePartnership : ""}`}
    >
      <div className={styles.partnershipTopRow}>
        <div className={styles.partnershipIdentity}>
          <strong>
            {partnership.isActive
              ? "Current partnership"
              : `${ordinal(index + 1)} wicket`}
          </strong>
          {partnership.isActive && (
            <span className={styles.livePartnershipBadge}>Live</span>
          )}
        </div>
        <div
          className={styles.partnershipTotal}
          aria-label={`${total} runs from ${partnership.balls ?? 0} balls`}
        >
          <strong>{total}</strong>
          <span>runs</span>
          <small>{partnership.balls ?? 0} balls</small>
        </div>
      </div>

      <div className={styles.partnershipBar} aria-hidden="true">
        <span
          className={styles.partnershipBarPrimary}
          style={{ width: `${firstPercentage}%` }}
        />
        <span className={styles.partnershipBarSecondary} />
      </div>

      <div className={styles.partnershipPlayers}>
        <PartnershipPlayer name={batterOne} stat={one} />
        {batterTwo && two ? (
          <PartnershipPlayer name={batterTwo} stat={two} align="end" />
        ) : (
          <span />
        )}
      </div>
    </article>
  );
}

function PartnershipPlayer({ name, stat, align = "start" }) {
  if (!name) return <span />;
  return (
    <div
      className={`${styles.partnershipPlayer} ${align === "end" ? styles.alignEnd : ""}`}
    >
      <span className={styles.partnershipPlayerName}>{formatName(name)}</span>
      <span className={styles.partnershipContribution}>
        <strong>{Number(stat.runs) || 0}</strong>
        <small>({Number(stat.balls) || 0})</small>
      </span>
    </div>
  );
}
