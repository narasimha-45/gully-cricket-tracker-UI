import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMatch, saveMatch } from "../storage/matchDB";
import BottomSheetSelector from "../components/BottomSheetSelector";
import EditMatchSheet from "../components/EditMatchSheet";
import Scorecard from "../components/Scorecard";
import { recreateMatch } from "../utils/recreateMatch";
import { formatOvers, calcCRR } from "../utils/calcutors";
import { updateLive, evaluateMatchState } from "../utils/matchStateHandlers";
import { deepCopy } from "../utils/helpers";
import {
  retireBatsman,
  pushSelectionHistory,
  applyRun,
  startSecondInnings,
  startSuperOver,
} from "../utils/matchEvents";
import { renderBatStats, renderBowlStats } from "../utils/renderStats";
import { applyWicket } from "../utils/applyWicket";
import {
  undoFromInningsPopup,
  undoFromMatchPopup,
  undoLast,
} from "../utils/undos";
import { acknowledgeMatchResult } from "../utils/acknowledgeMatchResult";
import styles from "./LiveMatch.module.css";
import { takeSnapshot } from "../utils/snapShot";
import WicketSheet from "../components/WicketSheet";
import MatchPopup from "../components/MatchPopup";
import OversTimeline from "../components/OversTimeline";
import { getCurrentPartnership } from "../utils/partnerships";
import InsightsTab from "../components/Insightstab";

/* ─────────────────────────────────────────────────────────────
   buildHeroRows
───────────────────────────────────────────────────────────── */
function buildHeroRows(match) {
  const { innings, live } = match;
  const currentIdx = live.inningsIndex;
  const visibleInnings = innings.slice(0, currentIdx + 1);
  const rows = [];

  const inn0 = visibleInnings[0];
  const inn1 = visibleInnings[1];

  if (inn0) {
    rows.push({
      label: inn0.battingTeam,
      inn: inn0,
      isCurrent: currentIdx === 0 && match.status !== "COMPLETED",
      isSuperOver: false,
      soNumber: null,
    });
  }
  if (inn1) {
    rows.push({
      label: inn1.battingTeam,
      inn: inn1,
      isCurrent: currentIdx === 1 && match.status !== "COMPLETED",
      isSuperOver: false,
      soNumber: null,
    });
  } else if (inn0 && currentIdx === 0) {
    rows.push({
      label: inn0.bowlingTeam,
      inn: null,
      isCurrent: false,
      isSuperOver: false,
      soNumber: null,
    });
  }

  let soIndex = 2;
  let soNumber = 1;
  while (soIndex <= currentIdx) {
    const soInn1 = visibleInnings[soIndex];
    const soInn2 = visibleInnings[soIndex + 1];
    if (soInn1) {
      rows.push({ isSectionLabel: true, label: `Super Over ${soNumber}` });
      rows.push({
        label: soInn1.battingTeam,
        inn: soInn1,
        isCurrent: currentIdx === soIndex && match.status !== "COMPLETED",
        isSuperOver: true,
        soNumber,
      });
    }
    if (soInn2) {
      rows.push({
        label: soInn2.battingTeam,
        inn: soInn2,
        isCurrent: currentIdx === soIndex + 1 && match.status !== "COMPLETED",
        isSuperOver: true,
        soNumber,
      });
    } else if (soInn1 && currentIdx === soIndex) {
      rows.push({
        label: soInn1.bowlingTeam,
        inn: null,
        isCurrent: false,
        isSuperOver: true,
        soNumber,
      });
    }
    soIndex += 2;
    soNumber += 1;
  }
  return rows;
}

/* ─────────────────────────────────────────────────────────────
   buildStatusLine
───────────────────────────────────────────────────────────── */
function buildStatusLine(match) {
  const { live, innings, totalOvers, status } = match;
  const currentIdx = live.inningsIndex;
  const inn = innings[currentIdx];
  const isSuperOver = currentIdx >= 2;
  const soNumber = isSuperOver ? Math.floor((currentIdx - 2) / 2) + 1 : null;

  if (status === "COMPLETED") {
    const r = match.result;
    if (r.winner === "TIE") return { type: "text", text: "Match Tied" };
    if (r.type === "SUPER_OVER")
      return { type: "text", text: `${r.winner} won via Super Over` };
    return {
      type: "text",
      text: `${r.winner} won by ${r.margin} ${r.type === "WICKETS" ? "wickets" : "runs"}`,
    };
  }

  if (currentIdx % 2 === 0) {
    return {
      type: "crr",
      crr: calcCRR(inn.totalRuns, inn.balls),
      isSuperOver,
      soNumber,
    };
  }

  if (isSuperOver) {
    return {
      type: "superOverChase",
      crr: calcCRR(inn.totalRuns, inn.balls),
      soNumber,
    };
  }

  const prevInn = innings[currentIdx - 1];
  const target = prevInn.totalRuns + 1;
  const totalBalls = totalOvers * 6;
  const ballsLeft = totalBalls - inn.balls;
  const need = Math.max(0, target - inn.totalRuns);
  const rrr = ballsLeft > 0 ? (need / (ballsLeft / 6)).toFixed(2) : "∞";

  return {
    type: "chase",
    crr: calcCRR(inn.totalRuns, inn.balls),
    rrr,
    need,
    ballsLeft,
  };
}

/* ═══════════════════════════════════════════════════════════ */

export default function LiveMatch() {
  const { matchId } = useParams();
  const navigate = useNavigate();

  const [sheet, setSheet] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("live");
  const [match, setMatch] = useState(null);
  const [extraMode, setExtraMode] = useState("NORMAL");
  const [ackSubmitting, setAckSubmitting] = useState(false);
  const [wicketUI, setWicketUI] = useState({
    open: false,
    type: null,
    helper: null,
    runOut: { outBatsman: null, runs: 0 },
  });

  useEffect(() => {
    if (!match?.seasonId) return;
    const handlePopState = () =>
      navigate(`/season/${match.seasonId}/matches`, { replace: true });
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [match, navigate]);

  useEffect(() => {
    getMatch(matchId).then((m) => {
      if (m) setMatch(m);
    });
  }, [matchId]);

  if (!match) return <p>Loading match…</p>;
  if (!match.live)
    return <p style={{ color: "#dc2626" }}>Complete toss to start match</p>;

  const { teams, live } = match;

  const innings = match.innings[live.inningsIndex];

  // Normalize names for safe comparison
  const normalize = (v = "") => v.trim().toLowerCase();

  const teamAName = normalize(teams.teamA.name);
  const teamBName = normalize(teams.teamB.name);

  const battingTeamName = normalize(innings.battingTeam);
  const bowlingTeamName = normalize(innings.bowlingTeam);

  // Correct batting players
  const battingPlayers =
    battingTeamName === teamAName ? teams.teamA.players : teams.teamB.players;

  // Correct bowling players
  const bowlingPlayers =
    bowlingTeamName === teamAName ? teams.teamA.players : teams.teamB.players;

  const eligibleBatsmen = battingPlayers.filter(
    (p) =>
      !live.outBatsmen.includes(p) &&
      p !== live.striker &&
      p !== live.nonStriker,
  );
  const disabledBowlers = [live.lastOverBowler];
  const setExtraModeWithHistory = (mode) =>
    setExtraMode((prev) => (prev === mode ? "NORMAL" : mode));

  const heroRows = buildHeroRows(match);
  const statusLine = buildStatusLine(match);

  // Current partnership for live tab
  const currentPartnership =
    match.status === "LIVE" ? getCurrentPartnership(innings) : null;

  /* ── UI ──────────────────────────────────────────────────── */
  return (
    <div className={styles.page}>
      <EditMatchSheet
        open={editOpen}
        match={match}
        onClose={() => setEditOpen(false)}
        onSave={setMatch}
      />
      <button
        onClick={() => navigate(`/season/${match.seasonId}/matches`)}
        style={{
          border: "none",
          background: "transparent",
          color: "#4338ca",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          padding: 0,
          marginBottom: 12,
        }}
      >
        ← Go Back 
      </button>

      {/* ── HERO CARD ──────────────────────────────────────── */}
      <div className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div className={styles.titleRow}>
            <p className={styles.liveBadge}>
              ● {match.status === "COMPLETED" ? "END" : "LIVE"}
            </p>
            <h2 className={styles.matchTitle}>
              {teams.teamA.name} vs {teams.teamB.name}
            </h2>
            <span className={styles.heroFormatPill}>
              {match.matchType === "TEST" ? "Test" : `${match.totalOvers} Ov`}
            </span>
          </div>
          <button
            className={styles.editBtn}
            onClick={() =>
              match.status === "COMPLETED"
                ? recreateMatch(match, navigate)
                : setEditOpen(true)
            }
          >
            {match.status === "COMPLETED" ? "↻" : "✎"}
          </button>
        </div>

        {/* Score rows */}
        <div className={styles.heroScoreRows}>
          {heroRows.map((row, idx) => {
            if (row.isSectionLabel) {
              return (
                <div key={`label-${idx}`} className={styles.heroSectionDivider}>
                  <div className={styles.heroSectionLine} />
                  <span className={styles.heroSectionLabel}>{row.label}</span>
                  <div className={styles.heroSectionLine} />
                </div>
              );
            }
            return (
              <div
                key={idx}
                className={`${styles.heroScoreRow} ${row.isCurrent ? styles.isCurrent : ""}`}
              >
                <span
                  className={row.isSuperOver ? styles.heroSuperOverTeam : ""}
                >
                  {row.label}
                </span>
                <span className={styles.heroScoreVal}>
                  {row.inn ? (
                    `${row.inn.totalRuns}-${row.inn.wickets} (${formatOvers(row.inn.balls)})`
                  ) : (
                    <span className={styles.heroYetToBat}>Yet to bat</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Status line */}
        <div className={styles.heroStatus}>
          {statusLine.type === "text" && (
            <div className={styles.heroResultText}>{statusLine.text}</div>
          )}
          {statusLine.type === "crr" && (
            <div className={styles.heroStatusCenter}>
              {statusLine.isSuperOver ? (
                <span className={styles.heroSuperOverBadge}>
                  Super Over {statusLine.soNumber} · CRR: {statusLine.crr}
                </span>
              ) : (
                <span>CRR: {statusLine.crr}</span>
              )}
            </div>
          )}
          {statusLine.type === "superOverChase" && (
            <div className={styles.heroStatusCenter}>
              <span className={styles.heroSuperOverBadge}>
                Super Over {statusLine.soNumber}
              </span>
              <span>CRR: {statusLine.crr}</span>
            </div>
          )}
          {statusLine.type === "chase" && (
            <>
              <div className={styles.heroStatusRow}>
                <span>CRR: {statusLine.crr}</span>
                <span>RRR: {statusLine.rrr}</span>
              </div>
              <div className={styles.heroStatusCenter}>
                Need {statusLine.need} in {statusLine.ballsLeft} balls
              </div>
            </>
          )}
        </div>
      </div>
      {/* Man of the Match */}
      {match.status === "COMPLETED" && match.result?.manOfTheMatch && (
        <div className={styles.motmCard}>
          <strong>🏆 Man of the Match</strong>
          <div style={{ marginTop: 6 }}>{match.result.manOfTheMatch}</div>
        </div>
      )}
      {/* ── TABS ───────────────────────────────────────────── */}
      <div className={styles.tabs}>
        {["live", "scorecard", "overs", "insights"].map((t) => (
          <button
            key={t}
            className={`${styles.tabBtn} ${tab === t ? styles.activeTab : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "live"
              ? match.status === "COMPLETED"
                ? "Summary"
                : "Live"
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === "scorecard" && <Scorecard match={match} />}
      {tab === "overs" && <OversTimeline match={match} />}
      {tab === "insights" && <InsightsTab match={match} />}
      {tab === "live" && match.status === "COMPLETED" && (
        <CompletedMatchSummary match={match} setTab={setTab} />
      )}
      {/* ── POPUPS ─────────────────────────────────────────── */}
      {match.status === "COMPLETED" && match.result && (
        <MatchPopup
          open={!match.ui?.matchResultSeen}
          title={`🏆 ${match.result.winner === "TIE" ? "Match Tied" : `${match.result.winner} Won`}`}
          subtitle={
            match.result.winner === "TIE"
              ? "Scores level after Super Over"
              : match.result.type === "SUPER_OVER"
                ? "via Super Over"
                : `by ${match.result.margin} ${match.result.type === "WICKETS" ? "wickets" : "runs"}`
          }
          primaryText="Finish Match"
          primaryLoadingText="Finalizing…"
          loading={ackSubmitting}
          onPrimary={() =>
            acknowledgeMatchResult(
              match,
              setMatch,
              setAckSubmitting,
              ackSubmitting,
            )
          }
          secondaryText="Undo Last Ball"
          onSecondary={() => undoFromMatchPopup(match, setMatch, setExtraMode)}
        />
      )}
      <MatchPopup
        open={!!match.live.pendingNextInnings}
        title="Innings Complete"
        subtitle={`${match.innings[0].battingTeam} scored ${match.innings[0].totalRuns} runs`}
        primaryText="Start Second Innings"
        onPrimary={() => startSecondInnings({ match, setMatch })}
        secondaryText="Undo Last Ball"
        onSecondary={() =>
          undoFromInningsPopup({ match, setMatch, setExtraMode })
        }
      />
      <MatchPopup
        open={!!match.live.pendingSuperOver}
        title="Match Tied!"
        subtitle="Scores are level. Ready for a Super Over?"
        primaryText="Start Super Over"
        onPrimary={() => startSuperOver({ match, setMatch })}
        secondaryText="Undo Last Ball"
        onSecondary={() =>
          undoFromInningsPopup({ match, setMatch, setExtraMode })
        }
      />
      {/* ── LIVE SCORING UI ────────────────────────────────── */}
      {tab === "live" && match.status === "LIVE" && (
        <>
          {/* Batting card */}
          <div className={styles.card}>
            <div className={styles.tableHeader}>
              <span>Batter</span>
              <span>R</span>
              <span>B</span>
              <span>4s</span>
              <span>6s</span>
            </div>
            {[live.striker, live.nonStriker].map((name, idx) => (
              <div key={idx} className={styles.tableRow}>
                <span
                  className={
                    !name ? styles.selectablePlayer : styles.playerName
                  }
                  onClick={() =>
                    !name && setSheet(idx === 0 ? "striker" : "nonStriker")
                  }
                >
                  {name ? `${name}${idx === 0 ? " *" : ""}` : "Select"}
                </span>
                {renderBatStats(innings, name)}
              </div>
            ))}
          </div>

          {/* ── Current Partnership ─────────────────────────── */}
          {/* Partnership — always visible once both batters are set */}
          {live.striker && live.nonStriker && (
            <div className={styles.partnershipCard}>
              <span className={styles.partnershipLabel}>Partnership</span>
              <div className={styles.partnershipMain}>
                <span className={styles.partnershipRuns}>
                  {currentPartnership?.runs ?? 0}
                  <span className={styles.partnershipBalls}>
                    {" "}
                    ({currentPartnership?.balls ?? 0})
                  </span>
                </span>
                <div className={styles.partnershipBatters}>
                  {currentPartnership
                    ? Object.keys(currentPartnership.contributions).map(
                        (name) => {
                          const c = currentPartnership.contributions[name];
                          return (
                            <span
                              key={name}
                              className={styles.partnershipBatter}
                            >
                              {name}: {c.runs} ({c.balls})
                            </span>
                          );
                        },
                      )
                    : [live.striker, live.nonStriker].map((name) => (
                        <span key={name} className={styles.partnershipBatter}>
                          {name}: 0 (0)
                        </span>
                      ))}
                </div>
              </div>
            </div>
          )}

          {/* Bowling card */}
          <div className={styles.card}>
            <div className={styles.tableHeader}>
              <span>Bowler</span>
              <span>O</span>
              <span>M</span>
              <span>R</span>
              <span>W</span>
            </div>
            <div className={styles.tableRow}>
              <span
                className={
                  !live.bowler ? styles.selectablePlayer : styles.playerName
                }
                onClick={() => !live.bowler && setSheet("bowler")}
              >
                {live.bowler ? `${live.bowler} *` : "Select bowler"}
              </span>
              {renderBowlStats(innings, live.bowler)}
            </div>
          </div>

          {/* This over */}
          {innings.thisOver.length >= 0 && (
            <div className={styles.overBox}>
              <p className={styles.overLabel}>This over</p>
              <div className={styles.overBalls}>
                {innings.thisOver.map((b, i) => {
                  let batRuns = 0;
                  if (b.type === "WIDE")
                    batRuns = Math.max(
                      0,
                      b.runs - (match.rules?.wide?.extraRun ? 1 : 0),
                    );
                  if (b.type === "NO_BALL")
                    batRuns = Math.max(
                      0,
                      b.runs - (match.rules?.noBall?.extraRun ? 1 : 0),
                    );

                  const chipClass = `${styles.ballChip} ${
                    b.type === "WICKET"
                      ? styles.wicketBall
                      : b.runs === 4
                        ? styles.fourBall
                        : b.runs === 6
                          ? styles.sixBall
                          : b.type === "WIDE"
                            ? styles.wideBall
                            : b.type === "NO_BALL"
                              ? styles.noBall
                              : styles.normalBall
                  }`;

                  return (
                    <span key={i} className={chipClass}>
                      {b.type === "RUN" && b.runs}
                      {b.type === "WIDE" &&
                        (batRuns > 0 ? `${batRuns}Wd` : "Wd")}
                      {b.type === "NO_BALL" &&
                        (batRuns > 0 ? `${batRuns}Nb` : "Nb")}
                      {b.type === "WICKET" && "W"}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Keypad */}
          <div className={styles.keypad}>
            {[1, 2, 3, 4, 6, 0].map((r) => (
              <button
                key={r}
                className={styles.keyBtn}
                onClick={() =>
                  applyRun({
                    runs: r,
                    match,
                    setMatch,
                    extraMode,
                    setExtraMode,
                  })
                }
              >
                {r}
              </button>
            ))}

            <button
              className={`${styles.keyBtn} ${styles.keyWide} ${extraMode === "WIDE" ? styles.keyWideActive : ""}`}
              onClick={() => setExtraModeWithHistory("WIDE")}
            >
              Wd
            </button>

            <button
              className={`${styles.keyBtn} ${styles.keyWide} ${extraMode === "NO_BALL" ? styles.keyWideActive : ""}`}
              onClick={() => setExtraModeWithHistory("NO_BALL")}
            >
              Nb
            </button>

            <button
              className={`${styles.keyBtn} ${
                !live.striker || !live.nonStriker || !live.bowler
                  ? styles.keyWicketDisabled
                  : styles.keyWicket
              }`}
              disabled={!live.striker || !live.nonStriker || !live.bowler}
              onClick={() => setWicketUI({ ...wicketUI, open: true })}
            >
              W
            </button>

            <button
              className={`${styles.keyBtn} ${live.history.length === 0 ? styles.keyUndoDisabled : styles.keyUndo}`}
              disabled={live.history.length === 0}
              onClick={() => undoLast({ match, setMatch, setExtraMode })}
            >
              ↺
            </button>

            <button
              className={`${styles.keyBtn} ${styles.keySpecial}`}
              onClick={() => {
                const updated = deepCopy(match);
                takeSnapshot(updated, "STRIKE_CHANGE", extraMode);
                const l = updated.live;
                [l.striker, l.nonStriker] = [l.nonStriker, l.striker];
                updated.updatedAt = Date.now();
                saveMatch(updated);
                setMatch(updated);
              }}
            >
              ⇄
            </button>

            <button
              className={`${styles.keyBtn} ${styles.keySpecial}`}
              disabled={!live.striker}
              onClick={() => retireBatsman(live.striker, match, setMatch)}
            >
              Ret
            </button>
          </div>
        </>
      )}
      {/* ── SELECTORS ──────────────────────────────────────── */}
      <BottomSheetSelector
        open={sheet === "striker"}
        title="Select Striker"
        items={eligibleBatsmen}
        onSelect={(p) => {
          pushSelectionHistory(match, extraMode);
          updateLive({ striker: p }, match, setMatch);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <BottomSheetSelector
        open={sheet === "nonStriker"}
        title="Select Non-Striker"
        items={eligibleBatsmen}
        onSelect={(p) => {
          pushSelectionHistory(match, extraMode);
          updateLive({ nonStriker: p }, match, setMatch);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <BottomSheetSelector
        open={sheet === "bowler"}
        title="Select Bowler"
        items={bowlingPlayers}
        disabledItems={disabledBowlers}
        onSelect={(p) => {
          pushSelectionHistory(match, extraMode);
          updateLive({ bowler: p }, match, setMatch);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <WicketSheet
        open={wicketUI.open}
        wicketUI={wicketUI}
        setWicketUI={setWicketUI}
        live={live}
        bowlingPlayers={bowlingPlayers}
        match={match}
        setMatch={setMatch}
        extraMode={extraMode}
        setExtraMode={setExtraMode}
      />
    </div>
  );
}

function CompletedMatchSummary({ match, setTab }) {
  const fmt = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
  const mainInnings = match.innings.slice(0, 2);
  const superOvers = match.innings.slice(2);

  return (
    <>
      {mainInnings.map((inn, i) => (
        <div key={i} className={styles.card} style={{ marginBottom: 6 }}>
          <strong>{inn.battingTeam}</strong>
          <div>
            {inn.totalRuns}/{inn.wickets} ({fmt(inn.balls)})
          </div>
        </div>
      ))}

      {superOvers.length > 0 &&
        superOvers.map((inn, i) => {
          const soNum = Math.floor(i / 2) + 1;
          const isFirst = i % 2 === 0;
          return (
            <div key={i} className={styles.card} style={{ marginBottom: 6 }}>
              {isFirst && (
                <div className={styles.soSummaryLabel}>Super Over {soNum}</div>
              )}
              <strong>{inn.battingTeam}</strong>
              <div>
                {inn.totalRuns}/{inn.wickets} ({fmt(inn.balls)})
              </div>
            </div>
          );
        })}

      <button className={styles.primaryBtn} onClick={() => setTab("scorecard")}>
        View Full Scorecard
      </button>
    </>
  );
}
