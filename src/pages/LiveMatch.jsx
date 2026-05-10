import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMatch, saveMatch } from "../storage/matchDB";
import BottomSheetSelector from "../components/BottomSheetSelector";
import EditMatchSheet from "../components/EditMatchSheet";
import Scorecard from "../components/Scorecard";
import { recreateMatch } from "../utils/recreateMatch";
import {
  primaryBtn,
  secondaryBtn,
  keyWide,
  keyWideActive,
  keypad,
  keyBtn,
  keyWicket,
  keyWicketDisabled,
  keyWideDisabled,
  keyUndo,
  grid2,
  btn,
  activeBtn,
  listItem,
  selectedListItem,
  confirmBtn,
  keyUndoActive,
  keyUndoDisabled,
  scoreBtn,
  scoreBtnDisabled,
  scoreRow,
  crr,
  infoRow,
  tabs,
  tabBtn,
  activeTab,
  headerCard,
  headerTop,
  editBtn,
  scoreMain,
  overs,
  card,
  tableHeader,
  row,
  selectable,
  overBox,
  overBalls,
  ballChip,
  popup,
  popupCard,
  popupActions,
  popupUndoBtn,
  popupPrimaryBtn,
} from "./LiveMatch.styles";
import { formatOvers, calcCRR } from "../utils/calcutors";
import {
  updateLive,
  endFirstInnings,
  endMatch,
  isInningsComplete,
  isTargetAchieved,
  evaluateMatchState,
} from "../utils/matchStateHandlers";
import { deepCopy } from "../utils/helpers";
import {
  retireBatsman,
  pushSelectionHistory,
  handleOverEnd,
  applyRun,
  startSecondInnings,
} from "../utils/matchEvents";
import { renderBatStats, renderBowlStats } from "../utils/renderStats";
import { applyWicket } from "../utils/applyWicket";
import {
  undoFromInningsPopup,
  undoFromMatchPopup,
  undoLast,
} from "../utils/undos";
import {
  deriveFieldingStats,
  calculateManOfTheMatch,
  calculatePlayerScore,
  getWinningTeamPlayers,
} from "../utils/statsCalculator";
import { acknowledgeMatchResult } from "../utils/acknowledgeMatchResult";
import styles from "./LiveMatch.module.css";
import { takeSnapshot } from "../utils/snapShot";

export default function LiveMatch() {
  const { matchId } = useParams();

  const navigate = useNavigate();

  const [matchState, setMatchState] = useState(null); // derived state for quick access
  const [sheet, setSheet] = useState(null); // striker | nonStriker | bowler
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("live");
  const [match, setMatch] = useState(null);
  const [extraMode, setExtraMode] = useState("NORMAL");
  const [ackSubmitting, setAckSubmitting] = useState(false);
  const [wicketUI, setWicketUI] = useState({
    open: false,
    type: null, // BOWLED | CAUGHT | RUN_OUT | STUMPED | ...
    helper: null, // fielder / keeper
    // Only used when type === "RUN_OUT"
    runOut: {
      outBatsman: null, // name of batsman
      runs: 0, // runs completed
    },
  });

  const [inningsEnd, setInningsEnd] = useState(false);
  const [matchEnd, setMatchEnd] = useState(false);

  useEffect(() => {
    if (!match || !match.seasonId) return;

    const handlePopState = () => {
      navigate(`/season/${match.seasonId}/matches`, { replace: true });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [match, navigate]);

  useEffect(() => {
    const load = async () => {
      const m = await getMatch(matchId);
      if (m) setMatch(m);
    };
    load();
  }, [matchId]);

  /* ---------------- LOADING ---------------- */

  if (!match) return <p>Loading match…</p>;
  if (!match.live)
    return <p style={{ color: "#dc2626" }}>Complete toss to start match</p>;

  const { teams, live } = match;
  const innings = match.innings[live.inningsIndex];

  /* ---------------- PLAYERS ---------------- */

  const battingPlayers =
    innings.battingTeam === teams.teamA.name
      ? teams.teamA.players
      : teams.teamB.players;

  const bowlingPlayers =
    innings.bowlingTeam === teams.teamA.name
      ? teams.teamA.players
      : teams.teamB.players;

  const eligibleBatsmen = battingPlayers.filter(
    (p) =>
      !live.outBatsmen.includes(p) &&
      p !== live.striker &&
      p !== live.nonStriker,
  );

  const disabledBowlers = [live.lastOverBowler];

  const WICKET_TYPES = [
    "BOWLED",
    "CAUGHT",
    "LBW",
    "STUMPED",
    "RUN_OUT",
    "HIT_WICKET",
    "SPECIAL",
  ];

  const invalidOnExtra = ["BOWLED", "LBW", "HIT_WICKET"];

  const isInvalidWicket =
    (extraMode === "NO_BALL" || extraMode === "WIDE") &&
    invalidOnExtra.includes(wicketUI.type);

  const setExtraModeWithHistory = (mode) => {
    setExtraMode((prev) => (prev === mode ? "NORMAL" : mode));
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={{ padding: 12 }}>
      {/* EDIT MATCH */}
      <EditMatchSheet
        open={editOpen}
        match={match}
        onClose={() => setEditOpen(false)}
        onSave={setMatch}
      />

      {/* HEADER */}
      <div className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div className={styles.titleRow}>
            <p className={styles.liveBadge}>
              ● {match.status === "COMPLETED" ? "END" : "LIVE"}
            </p>

            <h2 className={styles.matchTitle}>
              {teams.teamA.name} vs {teams.teamB.name}
            </h2>
          </div>

          <button
            className={styles.editBtn}
            onClick={() => {
              if (match.status === "COMPLETED") {
                recreateMatch(match, navigate);
              } else {
                setEditOpen(true);
              }
            }}
          >
            {match.status === "COMPLETED" ? "↻" : "✎"}
          </button>
        </div>

        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {[0, 1].map((idx) => {
            const inn = match.innings[idx];

            const isCurrent =
              idx === live.inningsIndex && match.status !== "COMPLETED";

            const teamName = idx === 0 ? teams.teamA.name : teams.teamB.name;

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",

                  opacity: inn ? 1 : 0.7,

                  fontWeight: isCurrent ? 700 : 500,

                  fontSize: 16,
                }}
              >
                <span>{teamName}</span>

                <span>
                  {inn ? (
                    <>
                      {inn.totalRuns}-{inn.wickets} ({formatOvers(inn.balls)})
                    </>
                  ) : (
                    "Yet to bat"
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {match.status === "COMPLETED" ? (
            <div
              style={{
                textAlign: "center",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {match.result.winner} won by {match.result.margin}{" "}
              {match.result.type === "WICKETS" ? "wickets" : "runs"}
            </div>
          ) : live.inningsIndex === 0 ? (
            <div style={{ textAlign: "center" }}>
              CRR: {calcCRR(innings.totalRuns, innings.balls)}
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>CRR: {calcCRR(innings.totalRuns, innings.balls)}</span>

                <span>
                  RRR:{" "}
                  {innings.balls < match.totalOvers * 6
                    ? (
                        (match.innings[0].totalRuns + 1 - innings.totalRuns) /
                        ((match.totalOvers * 6 - innings.balls) / 6)
                      ).toFixed(2)
                    : "∞"}
                </span>
              </div>

              <div
                style={{
                  textAlign: "center",
                  marginTop: 1,
                }}
              >
                Need {match.innings[0].totalRuns + 1 - innings.totalRuns} in{" "}
                {match.totalOvers * 6 - innings.balls} balls
              </div>
            </>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          
        </div>
      </div>

      {match.status === "COMPLETED" && match.result?.manOfTheMatch && (
        <div style={card}>
          <strong>🏆 Man of the Match</strong>
          <div style={{ marginTop: 6 }}>{match.result.manOfTheMatch}</div>
        </div>
      )}
      {/* TABS */}
      <div style={tabs}>
        <button
          style={tab === "live" ? activeTab : tabBtn}
          onClick={() => setTab("live")}
        >
          {match.status === "COMPLETED" ? "END" : "Live"}
        </button>

        <button
          style={tab === "scorecard" ? activeTab : tabBtn}
          onClick={() => setTab("scorecard")}
        >
          Scorecard
        </button>
      </div>

      {tab === "scorecard" && <Scorecard match={match} />}

      {tab === "live" && match.status === "COMPLETED" && (
        <CompletedMatchSummary match={match} setTab={setTab} />
      )}

      {match.live.pendingNextInnings && (
        <div style={popup}>
          <div style={popupCard}>
            <h2>Innings Complete</h2>

            <p style={{ marginTop: 8 }}>
              {match.innings[0].battingTeam} scored {match.innings[0].totalRuns}{" "}
              runs
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                style={secondaryBtn}
                onClick={() =>
                  undoFromInningsPopup({
                    match,
                    setMatch,
                    setExtraMode,
                  })
                }
              >
                Undo Last Ball
              </button>

              <button
                style={primaryBtn}
                onClick={() => startSecondInnings({ match, setMatch })}
              >
                Start Second Innings
              </button>
            </div>
          </div>
        </div>
      )}

      {match.status === "COMPLETED" && !match.ui?.matchResultSeen && (
        <div style={popup}>
          <div style={popupCard}>
            <h2>{match.result.winner} Won</h2>

            <p style={{ marginTop: 8 }}>
              by {match.result.margin}{" "}
              {match.result.type === "WICKETS" ? "wickets" : "runs"}
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                style={secondaryBtn}
                onClick={() =>
                  undoFromMatchPopup(match, setMatch, setExtraMode)
                }
              >
                Undo Last Ball
              </button>

              <button
                className={styles.finishBtn}
                disabled={ackSubmitting}
                onClick={() =>
                  acknowledgeMatchResult(
                    match,
                    setMatch,
                    setAckSubmitting,
                    ackSubmitting,
                  )
                }
              >
                {ackSubmitting ? (
                  <div className={styles.loaderRow}>
                    <div className={styles.spinner}></div>
                    Finalizing Match...
                  </div>
                ) : (
                  "Finish Match"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "live" && match.status === "LIVE" && (
        <>
          <div style={card}>
            <div style={tableHeader}>
              <span>Batter</span>
              <span>R</span>
              <span>B</span>
              <span>4s</span>
              <span>6s</span>
            </div>

            {[live.striker, live.nonStriker].map((name, idx) => (
              <div key={idx} style={row}>
                <span
                  style={selectable(!name)}
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

          {/* BOWLER */}
          <div style={card}>
            <div style={tableHeader}>
              <span>Bowler</span>
              <span>O</span>
              <span>M</span>
              <span>R</span>
              <span>W</span>
            </div>

            <div style={row}>
              <span
                style={selectable(!live.bowler)}
                onClick={() => !live.bowler && setSheet("bowler")}
              >
                {live.bowler ? `${live.bowler} *` : "Select bowler"}
              </span>
              {renderBowlStats(innings, live.bowler)}
            </div>
          </div>

          {/* {innings.thisOver?.length > 0 && ( */}
          {innings.thisOver.length >= 0 && (
            <div style={overBox}>
              <span>This over:</span>

              <div style={overBalls}>
                {innings.thisOver.map((b, i) => {
                  // calculate batting runs (excluding automatic extra)
                  let batRuns = 0;

                  if (b.type === "WIDE") {
                    batRuns = Math.max(
                      0,
                      b.runs - (match.rules?.wide?.extraRun ? 1 : 0),
                    );
                  }

                  if (b.type === "NO_BALL") {
                    batRuns = Math.max(
                      0,
                      b.runs - (match.rules?.noBall?.extraRun ? 1 : 0),
                    );
                  }

                  return (
                    <span
                      key={i}
                      className={`${styles.ballChip} ${
                        b.type === "WICKET"
                          ? styles.wicketBall
                          : b.runs === 4
                            ? styles.fourBall
                            : b.runs === 6
                              ? styles.sixBall
                              : styles.normalBall
                      }`}
                    >
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

          {/* )} */}

          <div style={keypad}>
            {[1, 2, 3, 4, 6, 0].map((r) => (
              <button
                key={r}
                style={keyBtn}
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
              style={extraMode === "WIDE" ? keyWideActive : keyWide}
              onClick={() => setExtraModeWithHistory("WIDE")}
            >
              Wd
            </button>

            <button
              style={extraMode === "NO_BALL" ? keyWideActive : keyWide}
              onClick={() => setExtraModeWithHistory("NO_BALL")}
            >
              Nb
            </button>

            <button
              style={
                !live.striker || !live.nonStriker || !live.bowler
                  ? keyWicketDisabled
                  : keyWicket
              }
              disabled={!live.striker || !live.nonStriker || !live.bowler}
              onClick={() => setWicketUI({ ...wicketUI, open: true })}
            >
              W
            </button>

            <button
              style={live.history.length === 0 ? keyUndoDisabled : keyUndo}
              onClick={() => undoLast({ match, setMatch, setExtraMode })}
              disabled={live.history.length === 0}
            >
              ↺
            </button>

            <button
              style={keyBtn}
              onClick={() => {
                const updated = deepCopy(match);

                // proper snapshot
                takeSnapshot(updated, "STRIKE_CHANGE", extraMode);

                const live = updated.live;

                // swap strike
                [live.striker, live.nonStriker] = [
                  live.nonStriker,
                  live.striker,
                ];

                updated.updatedAt = Date.now();

                saveMatch(updated);

                setMatch(updated);
              }}
            >
              ⇄
            </button>
            <button
              style={keyBtn}
              disabled={!live.striker}
              onClick={() => retireBatsman(live.striker, match, setMatch)}
            >
              Ret
            </button>
          </div>
        </>
      )}

      {/* BATTERS */}

      {/* SELECTORS */}
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

      <BottomSheetSelector
        open={wicketUI.open}
        title="Wicket"
        onClose={() => setWicketUI({ open: false })}
      >
        {/* WICKET TYPE */}
        <h4>Wicket Type</h4>
        <div style={grid2}>
          {WICKET_TYPES.map((t) => (
            <button
              key={t}
              style={wicketUI.type === t ? activeBtn : btn}
              onClick={() => setWicketUI({ ...wicketUI, type: t })}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* RUN OUT: WHO IS OUT */}
        {wicketUI.type === "RUN_OUT" && (
          <>
            {/* WHO GOT RUN OUT */}
            <h4>Who got run out?</h4>
            {[live.striker, live.nonStriker].map((p) => (
              <div
                key={p}
                style={
                  wicketUI.runOut.outBatsman === p ? selectedListItem : listItem
                }
                onClick={() =>
                  setWicketUI({
                    ...wicketUI,
                    runOut: {
                      ...wicketUI.runOut,
                      outBatsman: p,
                    },
                  })
                }
              >
                {p}
              </div>
            ))}

            {/* RUNS COMPLETED */}
            <h4 style={{ marginTop: 12 }}>Runs completed</h4>
            <div style={grid2}>
              {[0, 1, 2, 3, 4].map((r) => (
                <button
                  key={r}
                  style={wicketUI.runOut.runs === r ? activeBtn : btn}
                  onClick={() =>
                    setWicketUI({
                      ...wicketUI,
                      runOut: {
                        ...wicketUI.runOut,
                        runs: r,
                      },
                    })
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </>
        )}

        {/* FIELDER / CATCHER */}
        {["CAUGHT", "RUN_OUT", "STUMPED"].includes(wicketUI.type) && (
          <>
            <h4>Fielder</h4>
            {bowlingPlayers.map((p) => (
              <div
                key={p}
                style={wicketUI.helper === p ? selectedListItem : listItem}
                onClick={() => setWicketUI({ ...wicketUI, helper: p })}
              >
                {p}
              </div>
            ))}
          </>
        )}

        {/* ERROR */}
        {isInvalidWicket && (
          <p style={{ color: "red" }}>
            This wicket is not allowed on {extraMode}
          </p>
        )}

        {/* ERROR */}
        {isInvalidWicket && (
          <p style={{ color: "red" }}>
            This wicket is not allowed on {extraMode}
          </p>
        )}

        {["CAUGHT", "RUN_OUT", "STUMPED"].includes(wicketUI.type) &&
          !wicketUI.helper && (
            <p style={{ color: "red" }}>Please select a fielder</p>
          )}

        {/* CONFIRM */}
        <button
          style={confirmBtn}
          disabled={
            !wicketUI.type ||
            (wicketUI.type === "RUN_OUT" && !wicketUI.runOut.outBatsman)
          }
          onClick={() => {
            const outBatsman =
              wicketUI.type === "RUN_OUT"
                ? wicketUI.runOut.outBatsman
                : live.striker;

            // console.log("Wicket", wicketUI);

            applyWicket({
              wicketType: wicketUI.type,
              outBatsman,
              helper: wicketUI.helper,
              runs: wicketUI.type === "RUN_OUT" ? wicketUI.runOut.runs : 0,
              match,
              setMatch,
              extraMode,
              setExtraMode,
            });

            setWicketUI({
              open: false,
              type: null,
              helper: null,
              runOut: { outBatsman: null, runs: 0 },
            });
          }}
        >
          Confirm Wicket
        </button>
      </BottomSheetSelector>
    </div>
  );
}

function CompletedMatchSummary({ match, setTab }) {
  const formatOvers = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
  return (
    <>
      {match.innings.map((inn, i) => (
        <div key={i} style={card}>
          <strong>{inn.battingTeam}</strong>
          <div>
            {inn.totalRuns}/{inn.wickets} ({formatOvers(inn.balls)})
          </div>
        </div>
      ))}

      <button style={primaryBtn} onClick={() => setTab("scorecard")}>
        View Full Scorecard
      </button>
    </>
  );
}
