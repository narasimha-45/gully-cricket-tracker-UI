import { derivePartnerships } from "../../utils/partnerships";
import { sameName } from "../../utils/matchModel";
import { formatName } from "../../utils/helpers";
import styles from "../Scorecard.module.css";
import Partnerships from "./Partnerships";
import {
  formatDismissal,
  formatOvers,
  hasInningsStarted,
  sortBatters,
} from "./scorecardUtils";

export default function InningsCard({ innings, teams, label, tone }) {
  if (!hasInningsStarted(innings)) return null;

  const battingPlayers = sameName(innings.battingTeam, teams.teamA.name)
    ? (teams.teamA.players ?? [])
    : (teams.teamB.players ?? []);
  const battingStats = innings.battingStats ?? {};
  const bowlingStats = innings.bowlingStats ?? {};
  const battedPlayers = Object.keys(battingStats);
  const didNotBat = battingPlayers.filter(
    (player) => !battedPlayers.some((batted) => sameName(batted, player)),
  );

  const balls = Number(innings.balls) || 0;
  const totalRuns = Number(innings.totalRuns) || 0;
  const overs = formatOvers(balls);
  const runRate = balls === 0 ? "0.00" : ((totalRuns * 6) / balls).toFixed(2);
  const partnerships = derivePartnerships(innings);

  return (
    <article className={styles.inningsCard}>
      <header className={`${styles.inningsHeader} ${styles[tone]}`}>
        <div className={styles.inningsLabel}>{label}</div>
        <div
          className={styles.inningsScore}
          aria-label={`${totalRuns} for ${innings.wickets ?? 0}`}
        >
          {totalRuns}/{innings.wickets ?? 0}
          {innings.completionReason === "DECLARED" && <span className={styles.overs}> d </span> }
          {innings.isFollowOn && <span className={styles.overs}> f/o</span>}
          <span className={styles.overs}>({overs} ov)</span>
        </div>
      </header>

      <StatTable
        ariaLabel={`${label} batting`}
        columns={["Batter", "R", "B", "4s", "6s", "SR"]}
      >
        {Object.entries(battingStats)
          .sort(sortBatters)
          .map(([player, stat]) => (
            <BattingRow
              key={player}
              player={player}
              stat={stat}
              inningsCompleted={Boolean(innings.completed)}
            />
          ))}
      </StatTable>

      <InningsSummary
        innings={innings}
        overs={overs}
        runRate={runRate}
        didNotBat={didNotBat}
      />

      <h4 className={styles.sectionTitle}>Bowling</h4>
      <StatTable
        ariaLabel={`${label} bowling`}
        columns={["Bowler", "O", "M", "R", "W", "Eco"]}
      >
        {Object.entries(bowlingStats).map(([bowler, stat]) => (
          <BowlingRow key={bowler} bowler={bowler} stat={stat} />
        ))}
      </StatTable>

      {partnerships.length > 0 && <Partnerships partnerships={partnerships} />}
    </article>
  );
}

function StatTable({ columns, children, ariaLabel }) {
  return (
    <div
      className={styles.tableScroller}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      <div className={styles.statTable} role="table">
        <div className={styles.tableHeader} role="row">
          {columns.map((column, index) => (
            <span
              key={column}
              role="columnheader"
              className={index === 0 ? styles.textLeft : undefined}
            >
              {column}
            </span>
          ))}
        </div>
        <div role="rowgroup">{children}</div>
      </div>
    </div>
  );
}

function BattingRow({ player, stat, inningsCompleted }) {
  const balls = Number(stat?.balls) || 0;
  const runs = Number(stat?.runs) || 0;
  const strikeRate = balls === 0 ? "0.00" : ((runs * 100) / balls).toFixed(2);

  return (
    <div className={styles.tableRow} role="row">
      <div className={styles.playerCell} role="cell">
        <span className={styles.playerName}>{formatName(player)}</span>
        <span className={styles.dismissal}>
          {stat?.dismissal
            ? formatDismissal(stat.dismissal)
            : inningsCompleted
              ? "not out"
              : "batting"}
        </span>
      </div>
      <span className={styles.runs} role="cell">
        {runs}
      </span>
      <span role="cell">{balls}</span>
      <span role="cell">{stat?.fours ?? 0}</span>
      <span role="cell">{stat?.sixes ?? 0}</span>
      <span role="cell">{strikeRate}</span>
    </div>
  );
}

function BowlingRow({ bowler, stat }) {
  const balls = Number(stat?.balls) || 0;
  const runs = Number(stat?.runs) || 0;
  const economy = balls === 0 ? "0.00" : ((runs * 6) / balls).toFixed(2);

  return (
    <div className={styles.tableRow} role="row">
      <span className={styles.playerName} role="cell">
        {formatName(bowler)}
      </span>
      <span role="cell">{formatOvers(balls)}</span>
      <span role="cell">{stat?.maidens ?? 0}</span>
      <span role="cell">{runs}</span>
      <span className={styles.runs} role="cell">
        {stat?.wickets ?? 0}
      </span>
      <span role="cell">{economy}</span>
    </div>
  );
}

function InningsSummary({ innings, overs, runRate, didNotBat }) {
  const wides = Number(innings.extras?.wides) || 0;
  const noBalls = Number(innings.extras?.noBalls) || 0;
  const byes = Number(innings.extras?.byes) || 0;
  const legByes = Number(innings.extras?.legByes) || 0;
  const penalty = Number(innings.extras?.penaltyRuns) || 0;
  const extrasTotal = wides + noBalls + byes + legByes + penalty;
  const details = [
    wides > 0 && `Wd ${wides}`,
    noBalls > 0 && `Nb ${noBalls}`,
    byes > 0 && `B ${byes}`,
    legByes > 0 && `Lb ${legByes}`,
    penalty > 0 && `P ${penalty}`,
  ].filter(Boolean);

  return (
    <div className={styles.summary}>
      <SummaryRow label="Extras">
        {extrasTotal}
        {details.length > 0 ? ` (${details.join(", ")})` : ""}
      </SummaryRow>
      <SummaryRow label="Total" strong>
        {innings.totalRuns ?? 0}-{innings.wickets ?? 0} ({overs} overs, RR{" "}
        {runRate})
      </SummaryRow>
      {didNotBat.length > 0 && (
        <SummaryRow label="Yet to bat">
          <span className={styles.yetToBat}>
            {didNotBat.map(formatName).join(", ")}
          </span>
        </SummaryRow>
      )}
    </div>
  );
}

function SummaryRow({ label, children, strong = false }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.summaryLabel}>{label}</span>
      <span
        className={strong ? styles.summaryValueStrong : styles.summaryValue}
      >
        {children}
      </span>
    </div>
  );
}
