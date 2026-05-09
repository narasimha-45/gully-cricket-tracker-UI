import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMatch, saveMatch } from "../storage/matchDB";
import BottomSheetSelector from "../components/BottomSheetSelector";
import EditMatchSheet from "../components/EditMatchSheet";
import Scorecard from "../components/Scorecard";
import { recreateMatch } from "../utils/recreateMatch";
import {
  formatOvers,
  calcCRR,
} from "../utils/calcutors";
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
import { undoFromInningsPopup, undoFromMatchPopup, undoLast } from "../utils/undos";
import {
  deriveFieldingStats,
  calculateManOfTheMatch,
  calculatePlayerScore,
  getWinningTeamPlayers,
} from "../utils/statsCalculator";
import { acknowledgeMatchResult } from "../utils/acknowledgeMatchResult";

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
      <div style={headerCard}>
        <div style={headerTop}>
          <span>
            {teams.teamA.name} vs {teams.teamB.name}
          </span>
          <button
            style={editBtn}
            onClick={() => {
              if (match.status === "COMPLETED") {
                recreateMatch(match);
              } else {
                setEditOpen(true);
              }
            }}
          >
            {match.status === "COMPLETED" ? "↻" : "✎"}
          </button>
        </div>

        <div style={scoreRow}>
          <span style={scoreMain}>
            {innings.battingTeam} {innings.totalRuns}-{innings.wickets}
            <span style={overs}>
              {" "}
              ({formatOvers(innings.balls)}) / {match.totalOvers}
            </span>
          </span>

          <span style={crr}>
            CRR {calcCRR(innings.totalRuns, innings.balls)}
          </span>
        </div>

        <div style={infoRow}>
          {match.status === "COMPLETED" ? (
            <strong>
              {match.result.winner} won by {match.result.margin}{" "}
              {match.result.type === "WICKETS" ? "wickets" : "runs"}
            </strong>
          ) : live.inningsIndex === 0 ? (
            `${match.toss.winner} opted to ${match.toss.decision}`
          ) : (
            `Need ${match.innings[0].totalRuns + 1 - innings.totalRuns} runs`
          )}
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
          Live
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
                style={primaryBtn}
                onClick={() =>
                  acknowledgeMatchResult(
                    match,
                    setMatch,
                    setAckSubmitting,
                    ackSubmitting,
                  )
                }
              >
                OK
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
                    <span key={i} style={ballChip}>
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
            {[0, 1, 2, 3, 4, 6].map((r) => (
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
                const live = updated.live;
                const innings = updated.innings[live.inningsIndex];

                // FULL history snapshot (same as others)
                live.history.push({
                  type: "STRIKE_CHANGE",
                  prevState: {
                    striker: live.striker,
                    nonStriker: live.nonStriker,
                    bowler: live.bowler,
                    lastOverBowler: live.lastOverBowler,
                    balls: innings.balls,
                    totalRuns: innings.totalRuns,
                    wickets: innings.wickets,
                    battingStats: deepCopy(innings.battingStats),
                    bowlingStats: deepCopy(innings.bowlingStats),
                    outBatsmen: [...live.outBatsmen],
                    thisOver: deepCopy(innings.thisOver || []),
                    extraMode,
                  },
                });

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

/* ---------------- STYLES ---------------- */

const primaryBtn = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtn = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontWeight: 600,
  cursor: "pointer",
};

const keyWide = {
  padding: "14px 0",
  borderRadius: 12,
  background: "#fde68a", // soft yellow (extra)
  color: "#92400e",
  fontSize: 16,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  touchAction: "manipulation",
};

const overBox = {
  padding: 12,
  borderRadius: 10,
  background: "#f3f4f6",
  marginBottom: 12,
};

const overBalls = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 6,
};

const ballChip = {
  minWidth: 28,
  height: 28,
  borderRadius: "50%",
  background: "#4f46e5",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
};

const popup = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const popupCard = {
  background: "#ffffff",
  padding: "24px 28px",
  borderRadius: 16,
  width: 320,
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  textAlign: "center",
};

const popupActions = {
  display: "flex",
  gap: 12,
};

const popupUndoBtn = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 10,
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  fontWeight: 600,
  cursor: "pointer",
};

const popupPrimaryBtn = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 10,
  background: "#16a34a",
  color: "#fff",
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
};

const keyBtn = {
  padding: "14px 0",
  borderRadius: 12,
  background: "#eef2ff",
  fontSize: 18,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  touchAction: "manipulation",
};

const keyWicket = {
  ...keyBtn,
  background: "#fecaca", // red
  color: "#7f1d1d",
  fontSize: 20,
};

const keyWicketDisabled = {
  ...keyWicket,
  opacity: 0.5,
  cursor: "not-allowed",
};

const keyWideActive = {
  ...keyWide,
  outline: "2px solid #f59e0b",
};

const keypad = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10,
  marginTop: 16,
};

const keyWideDisabled = {
  ...keyWide,
  opacity: 0.5,
  cursor: "not-allowed",
};

const keyUndo = {
  padding: "14px 0",
  borderRadius: 12,
  background: "#e5e7eb", // neutral gray
  color: "#374151",
  fontSize: 18,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  touchAction: "manipulation",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 12,
};

const btn = {
  padding: "10px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const activeBtn = {
  ...btn,
  background: "#4f46e5",
  color: "#fff",
  border: "none",
};

const listItem = {
  padding: "10px",
  borderBottom: "1px solid #e5e7eb",
  cursor: "pointer",
};

const selectedListItem = {
  ...listItem,
  background: "#4f46e5",
  color: "#fff",
};

const confirmBtn = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 700,
  marginTop: 12,
};

const keyUndoActive = {
  ...keyUndo,
  background: "#d1d5db",
};

const keyUndoDisabled = {
  ...keyUndo,
  opacity: 0.5,
  cursor: "not-allowed",
};

const scoreBtn = {
  padding: "16px 0",
  borderRadius: 12,
  background: "#eef2ff",
  border: "none",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
};

const scoreBtnDisabled = {
  ...scoreBtn,
  opacity: 0.4,
  cursor: "not-allowed",
};

const scoreRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
};

const crr = {
  fontSize: 13,
  fontWeight: 600,
  color: "#1e40af",
};

const infoRow = {
  fontSize: 12,
  textAlign: "center",
  color: "#6b7280",
  marginTop: 4,
};

const tabs = {
  display: "flex",
  gap: 8,
  marginBottom: 16,
};

const tabBtn = {
  flex: 1,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
};

const activeTab = {
  ...tabBtn,
  background: "#4f46e5",
  color: "#fff",
};

const headerCard = {
  background: "#eef2ff",
  padding: 12,
  borderRadius: 12,
  marginBottom: 12,
};

const headerTop = {
  display: "flex",
  justifyContent: "space-between",
  fontWeight: 600,
};

const editBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#4f46e5",
};

const scoreMain = {
  fontSize: 20,
  fontWeight: 700,
  marginTop: 6,
};

const overs = {
  fontSize: 14,
  color: "#6b7280",
};

const card = {
  background: "#f9fafb",
  padding: 12,
  borderRadius: 12,
  marginBottom: 16,
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(4,1fr)",
  fontSize: 13,
  color: "#6b7280",
};

const row = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(4,1fr)",
  padding: "6px 0",
};

const selectable = (enabled) => ({
  color: enabled ? "#4f46e5" : "#111827",
  fontWeight: 600,
  cursor: enabled ? "pointer" : "default",
  opacity: enabled ? 1 : 0.5,
});
