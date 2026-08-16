import { formatName } from "../../utils/helpers";
import styles from "../Scorecard.module.css";
import { partnershipKey } from "./scorecardUtils";

const EMPTY_STAT = { runs: 0, balls: 0 };

export default function Partnerships({ partnerships }) {
  return (
    <section aria-labelledby="partnerships-heading">
      <h4 className={styles.sectionTitle} id="partnerships-heading">
        Partnerships
      </h4>
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
    ? partnership.contributions?.[batterTwo] ?? EMPTY_STAT
    : null;
  const total = Number(partnership.runs) || 0;
  const firstPercentage =
    total === 0
      ? 50
      : Math.max(8, Math.min(92, Math.round((one.runs / total) * 100)));

  return (
    <div
      className={`${styles.partnershipRow} ${partnership.isActive ? styles.activePartnership : ""}`}
    >
      <div className={styles.partnershipTopRow}>
        <span className={styles.partnershipLabel}>
          {partnership.isActive ? "Current" : `Wkt ${index + 1}`}
        </span>
        <span className={styles.partnershipTotal}>
          {partnership.runs ?? 0}
          <span> ({partnership.balls ?? 0})</span>
        </span>
      </div>

      <div className={styles.partnershipBar} aria-hidden="true">
        <span
          className={styles.partnershipBarPrimary}
          style={{ "--partnership-width": `${firstPercentage}%` }}
        />
        <span className={styles.partnershipBarSecondary} />
      </div>

      <div className={styles.partnershipNames}>
        <PartnershipPlayer name={batterOne} stat={one} />
        {batterTwo && two && (
          <PartnershipPlayer name={batterTwo} stat={two} align="end" />
        )}
      </div>
    </div>
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
        {stat.runs ?? 0} ({stat.balls ?? 0})
      </span>
    </div>
  );
}
