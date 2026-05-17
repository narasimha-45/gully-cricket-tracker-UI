import { useState } from "react";
import Scorecard from "./Scorecard";
import OversTimeline from "./OversTimeline";
import styles from "../pages/LiveMatch.module.css";

function buildHeroRows(match) {
  const { innings } = match;
  const rows = [];

  const mainInnings = innings.slice(0, 2);
  const superOvers = innings.slice(2);

  mainInnings.forEach((inn) => {
    rows.push({
      label: inn.battingTeam,
      inn,
      isSuperOver: false,
    });
  });
  if (superOvers.length > 0) {
    superOvers.forEach((inn, i) => {
      rows.push({
        isSectionLabel: i % 2 === 0,
        section: `Super Over ${Math.floor(i / 2) + 1}`,
        label: inn.battingTeam,
        inn,
        isSuperOver: true,
      });
    });
  }

  return rows;
}

function buildResultText(match) {
  const r = match.result;

  if (!r) return "";

  if (r.winner === "TIE") {
    return "Match Tied";
  }
  if (r.type === "SUPER_OVER") {
    return `${r.winner} won via Super Over`;
  }

  return `${r.winner} won by ${r.margin} ${
    r.type === "WICKETS" ? "wickets" : "runs"
  }`;
}

function fmt(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export default function CompletedMatchView({ match, topBar, showTabs = true }) {
  const [tab, setTab] = useState("summary");

  const heroRows = buildHeroRows(match);
  const resultText = buildResultText(match);

  return (
    <div className={styles.page}>
      {topBar}
      {/* HERO */}
      <div className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div className={styles.titleRow}>
            <p className={styles.liveBadge}>● END</p>

            <h2 className={styles.matchTitle}>
              {match.teams.teamA.name} vs {match.teams.teamB.name}
            </h2>

            <span className={styles.heroFormatPill}>
              {match.matchType === "TEST" ? "Test" : `${match.totalOvers} Ov`}
            </span>
          </div>
        </div>

        {/* SCORE ROWS */}
        <div className={styles.heroScoreRows}>
          {heroRows.map((row, idx) => (
            <div key={idx}>
              {row.isSectionLabel && (
                <div className={styles.heroSectionLabel}>{row.section}</div>
              )}

              <div className={styles.heroScoreRow}>
                <span
                  className={row.isSuperOver ? styles.heroSuperOverTeam : ""}
                >
                  {row.label}
                </span>

                <span className={styles.heroScoreVal}>
                  {row.inn.totalRuns}-{row.inn.wickets} ({fmt(row.inn.balls)})
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.heroStatus}>
          <div className={styles.heroResultText}>{resultText}</div>
        </div>
      </div>
      {/* MOM */}
      {match.result?.manOfTheMatch && (
        <div className={styles.motmCard}>
          <strong>🏆 Man of the Match</strong>

          <div style={{ marginTop: 6 }}>{match.result.manOfTheMatch}</div>
        </div>
      )}
      {/* TABS */}
      {showTabs && (
        <div className={styles.tabs}>
          {["summary", "scorecard", "overs"].map((t) => (
            <button
              key={t}
              className={`${styles.tabBtn} ${
                tab === t ? styles.activeTab : ""
              }`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}
      {/* SUMMARY */}
      {tab === "summary" && (
        <>
          {match.innings.map((inn, i) => (
            <div key={i} className={styles.card}>
              {i >= 2 && i % 2 === 0 && (
                <div className={styles.soSummaryLabel}>
                  Super Over {Math.floor((i - 2) / 2) + 1}
                </div>
              )}

              <strong>{inn.battingTeam}</strong>

              <div>
                {inn.totalRuns}/{inn.wickets} ({fmt(inn.balls)})
              </div>
            </div>
          ))}
        </>
      )}
      {/* SCORECARD */} {tab === "scorecard" && <Scorecard match={match} />}
      {/* OVERS */}
      {tab === "overs" && <OversTimeline match={match} />}
    </div>
  );
}
