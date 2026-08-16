import { useEffect, useReducer, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MatchSessionProvider } from "../features/match/state/MatchSessionContext.jsx";
import { useMatchSession } from "../features/match/state/useMatchSession";
import { formatName } from "../utils/helpers";
import { createEmptyInnings, normalizeName } from "../utils/matchModel";
import styles from "./TossPage.module.css";

const initialUi = {
  winnerKey: null,
  decision: null,
  isFlipping: false,
  flipResult: null,
  saving: false,
  error: "",
};

function tossUiReducer(state, action) {
  switch (action.type) {
    case "winner":
      return { ...state, winnerKey: action.value, error: "" };
    case "decision":
      return { ...state, decision: action.value, error: "" };
    case "flip/start":
      return { ...state, isFlipping: true, flipResult: null };
    case "flip/result":
      return { ...state, isFlipping: false, flipResult: action.value };
    case "save/start":
      return { ...state, saving: true, error: "" };
    case "save/error":
      return {
        ...state,
        saving: false,
        error: action.error || "Unable to save toss",
      };
    default:
      return state;
  }
}

export default function TossPage() {
  const { matchId } = useParams();
  return (
    <MatchSessionProvider matchId={matchId}>
      <TossPageContent />
    </MatchSessionProvider>
  );
}

function TossPageContent() {
  const { seasonId, matchId } = useParams();
  const navigate = useNavigate();
  const timersRef = useRef([]);
  const {
    phase,
    match,
    error: sessionError,
    persistReplacement,
  } = useMatchSession();
  const [ui, uiDispatch] = useReducer(tossUiReducer, initialUi);

  useEffect(
    () => () => timersRef.current.forEach((timer) => clearTimeout(timer)),
    [],
  );

  if (phase === "loading")
    return <p className={styles.stateMessage}>Loading toss…</p>;
  if (phase === "error" || !match) {
    return (
      <p className={styles.stateMessage} role="alert">
        {sessionError?.message || "Match not found on this device."}
      </p>
    );
  }

  const teamAName = formatName(match.teams.teamA.name);
  const teamBName = formatName(match.teams.teamB.name);
  const canProceed = Boolean(ui.winnerKey && ui.decision && !ui.saving);

  const flipCoin = () => {
    if (ui.isFlipping) return;
    uiDispatch({ type: "flip/start" });
    const timer = setTimeout(() => {
      uiDispatch({
        type: "flip/result",
        value:
          crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0
            ? "heads"
            : "tails",
      });
    }, 700);
    timersRef.current.push(timer);
  };

  const handleProceed = async () => {
    if (!canProceed) return;
    uiDispatch({ type: "save/start" });

    const winnerTeam = match.teams[ui.winnerKey];
    const loserKey = ui.winnerKey === "teamA" ? "teamB" : "teamA";
    const loserTeam = match.teams[loserKey];
    const battingTeam = ui.decision === "bat" ? winnerTeam : loserTeam;
    const bowlingTeam = ui.decision === "bat" ? loserTeam : winnerTeam;

    const updatedMatch = {
      ...match,
      status: "LIVE",
      toss: {
        winner: normalizeName(winnerTeam.name),
        decision: ui.decision,
      },
      innings: [
        createEmptyInnings({
          battingTeam: battingTeam.name,
          bowlingTeam: bowlingTeam.name,
          inningsNumber: 1,
        }),
      ],
      live: {
        inningsIndex: 0,
        striker: null,
        nonStriker: null,
        bowler: null,
        outBatsmen: [],
        lastOverBowler: null,
        history: [],
        pendingNextInnings: false,
        pendingNextInningsIndex: null,
        pendingSuperOver: false,
      },
      updatedAt: Date.now(),
    };

    try {
      await persistReplacement(updatedMatch);
      navigate(`/season/${seasonId}/match/${matchId}/live`, { replace: true });
    } catch (saveError) {
      uiDispatch({
        type: "save/error",
        error: saveError?.message || "Could not save the toss on this device.",
      });
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Match setup</span>
        <h1>Toss</h1>
        <p>
          {teamAName} <span>vs</span> {teamBName}
        </p>
      </header>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Coin flip</h2>
            <p>Optional helper for deciding the toss.</p>
          </div>
          {ui.flipResult && (
            <span className={styles.resultBadge}>
              {formatName(ui.flipResult)}
            </span>
          )}
        </div>

        <button
          type="button"
          className={`${styles.coin} ${ui.isFlipping ? styles.flipping : ""}`}
          onClick={flipCoin}
          disabled={ui.isFlipping || ui.saving}
          aria-label="Flip coin"
        >
          <span aria-hidden="true">🪙</span>
          <strong>
            {ui.isFlipping ? "Flipping" : ui.flipResult || "Flip"}
          </strong>
        </button>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Who won the toss?</h2>
            <p>Select the winning team.</p>
          </div>
          <span aria-hidden="true">🎯</span>
        </div>

        <div className={styles.choiceGrid}>
          <button
            type="button"
            className={ui.winnerKey === "teamA" ? styles.selected : ""}
            onClick={() => uiDispatch({ type: "winner", value: "teamA" })}
            disabled={ui.saving}
            aria-pressed={ui.winnerKey === "teamA"}
          >
            {teamAName}
          </button>
          <button
            type="button"
            className={ui.winnerKey === "teamB" ? styles.selected : ""}
            onClick={() => uiDispatch({ type: "winner", value: "teamB" })}
            disabled={ui.saving}
            aria-pressed={ui.winnerKey === "teamB"}
          >
            {teamBName}
          </button>
        </div>
      </section>

      <section
        className={`${styles.card} ${!ui.winnerKey ? styles.muted : ""}`}
      >
        <div className={styles.cardHeader}>
          <div>
            <h2>Toss decision</h2>
            <p>What did the winning team choose?</p>
          </div>
          <span aria-hidden="true">⚡</span>
        </div>

        <div className={styles.choiceGrid}>
          <button
            type="button"
            className={ui.decision === "bat" ? styles.selected : ""}
            onClick={() => uiDispatch({ type: "decision", value: "bat" })}
            disabled={!ui.winnerKey || ui.saving}
            aria-pressed={ui.decision === "bat"}
          >
            🏏 Bat first
          </button>
          <button
            type="button"
            className={ui.decision === "bowl" ? styles.selected : ""}
            onClick={() => uiDispatch({ type: "decision", value: "bowl" })}
            disabled={!ui.winnerKey || ui.saving}
            aria-pressed={ui.decision === "bowl"}
          >
            🔴 Bowl first
          </button>
        </div>
      </section>

      {ui.error && (
        <p className={styles.stateMessage} role="alert">
          {ui.error}
        </p>
      )}

      <button
        type="button"
        className={styles.primaryButton}
        disabled={!canProceed}
        onClick={handleProceed}
      >
        {ui.saving ? "Saving match…" : "Start match"}
      </button>
    </main>
  );
}
