import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMatch, saveMatch } from "../storage/matchDB";
import { formatName } from "../utils/helpers";
import { createEmptyInnings, normalizeName } from "../utils/matchModel";
import styles from "./TossPage.module.css";

export default function TossPage() {
  const { seasonId, matchId } = useParams();
  const navigate = useNavigate();
  const timersRef = useRef([]);

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [winnerKey, setWinnerKey] = useState(null);
  const [decision, setDecision] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState(null);

  useEffect(() => {
    getMatch(matchId)
      .then(setMatch)
      .finally(() => setLoading(false));

    return () => timersRef.current.forEach(clearTimeout);
  }, [matchId]);

  if (loading) return <p className={styles.stateMessage}>Loading toss…</p>;
  if (!match) return <p className={styles.stateMessage}>Match not found.</p>;

  const teamAName = formatName(match.teams.teamA.name);
  const teamBName = formatName(match.teams.teamB.name);
  const canProceed = Boolean(winnerKey && decision);

  const flipCoin = () => {
    if (isFlipping) return;

    setIsFlipping(true);
    setFlipResult(null);

    const resultTimer = setTimeout(() => {
      setFlipResult(Math.random() <= 0.5 ? "heads" : "tails");
      setIsFlipping(false);
    }, 1500);

    timersRef.current.push(resultTimer);
  };

  const handleProceed = async () => {
    if (!canProceed) return;

    const winnerTeam = match.teams[winnerKey];
    const loserKey = winnerKey === "teamA" ? "teamB" : "teamA";
    const loserTeam = match.teams[loserKey];
    const battingTeam = decision === "bat" ? winnerTeam : loserTeam;
    const bowlingTeam = decision === "bat" ? loserTeam : winnerTeam;

    const updatedMatch = {
      ...match,
      status: "LIVE",
      toss: {
        winner: normalizeName(winnerTeam.name),
        decision,
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

    await saveMatch(updatedMatch);
    navigate(`/season/${seasonId}/match/${matchId}/live`, { replace: true });
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
          {flipResult && (
            <span className={styles.resultBadge}>{formatName(flipResult)}</span>
          )}
        </div>

        <button
          type="button"
          className={`${styles.coin} ${isFlipping ? styles.flipping : ""}`}
          onClick={flipCoin}
          disabled={isFlipping}
          aria-label="Flip coin"
        >
          <span>🪙</span>
          <strong>{isFlipping ? "Flipping" : flipResult || "Flip"}</strong>
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
            className={winnerKey === "teamA" ? styles.selected : ""}
            onClick={() => setWinnerKey("teamA")}
          >
            {teamAName}
          </button>
          <button
            type="button"
            className={winnerKey === "teamB" ? styles.selected : ""}
            onClick={() => setWinnerKey("teamB")}
          >
            {teamBName}
          </button>
        </div>
      </section>

      <section className={`${styles.card} ${!winnerKey ? styles.muted : ""}`}>
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
            className={decision === "bat" ? styles.selected : ""}
            onClick={() => setDecision("bat")}
            disabled={!winnerKey}
          >
            🏏 Bat first
          </button>
          <button
            type="button"
            className={decision === "bowl" ? styles.selected : ""}
            onClick={() => setDecision("bowl")}
            disabled={!winnerKey}
          >
            🔴 Bowl first
          </button>
        </div>
      </section>

      <button
        type="button"
        className={styles.primaryButton}
        disabled={!canProceed}
        onClick={handleProceed}
      >
        Start match
      </button>
    </main>
  );
}
