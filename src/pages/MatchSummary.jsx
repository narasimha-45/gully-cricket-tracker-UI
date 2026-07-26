import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import InsightsTab from "../components/InsightsTab";
import MatchHero from "../components/MatchHero";
import MatchSummaryTab from "../components/MatchSummaryTab";
import OversTimeline from "../components/OversTimeline";
import Scorecard from "../components/Scorecard";
import { saveMatch } from "../storage/matchDB";
import { formatName } from "../utils/helpers";
import styles from "./MatchSummary.module.css";

const tabs = ["summary", "scorecard", "overs", "insights"];

const normalizeCompletedMatch = (response) => {
  if (!response) return null;
  const matchData = response.matchData || response;
  const innings = matchData.innings || response.innings || [];
  const result = response.result || matchData.result || null;
  const previousLive = response.live || matchData.live || {};

  return {
    ...matchData,
    id: response.id || matchData.id,
    innings,
    result,
    fieldingStats: response.fieldingStats || matchData.fieldingStats,
    status: "COMPLETED",
    live: {
      ...previousLive,
      inningsIndex: Math.max(0, innings.length - 1),
      pendingNextInnings: false,
      pendingSuperOver: false,
    },
    ui: { ...(matchData.ui || {}), matchResultSeen: true },
  };
};

export default function MatchSummary() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("summary");

  useEffect(() => {
    let active = true;

    api.matches
      .getMatch(matchId)
      .then((data) => {
        if (active) {
          setResponse(data);
          window.scrollTo(0, 0);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError?.message || "Unable to load this scorecard.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [matchId]);

  const match = useMemo(() => normalizeCompletedMatch(response), [response]);

  const playAgain = async () => {
    if (!match) return;

    const newMatchId = `match_${Date.now()}`;
    const newMatch = {
      id: newMatchId,
      seasonId: match.seasonId,
      matchType: match.matchType,
      totalOvers: match.totalOvers,
      testConfig: match.testConfig || null,
      rules: match.rules,
      teams: {
        teamA: {
          ...match.teams.teamA,
          players: [...(match.teams.teamA.players || [])],
        },
        teamB: {
          ...match.teams.teamB,
          players: [...(match.teams.teamB.players || [])],
        },
      },
      toss: null,
      innings: [],
      live: null,
      result: null,
      status: "setup",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveMatch(newMatch);
    navigate(`/season/${match.seasonId}/match/${newMatchId}/toss`);
  };

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingCard}>
          <div className={styles.pulseIcon}>🏏</div>
          <strong>Getting match summary</strong>
          <p>Loading scorecard, innings, and match insights…</p>
          <div className={styles.loaderTrack}>
            <span className={styles.loaderBar} />
          </div>
        </div>
      </div>
    );
  }

  if (!match || error) {
    return (
      <div className={styles.errorState}>
        <span>❌</span>
        <strong>Match not found</strong>
        <p>{error || "Unable to load this scorecard."}</p>
        <button type="button" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  const hasBallData = match.innings.some(
    (innings) => innings.ballByBall?.length > 0,
  );
  const manOfTheMatch =
    response?.manOfTheMatch || match.result?.manOfTheMatch || null;

  return (
    <main className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <MatchHero match={match} onAction={playAgain} />

      {manOfTheMatch && (
        <section className={styles.motmCard}>
          <strong>🏆 Man of the Match</strong>
          <span>{formatName(manOfTheMatch)}</span>
        </section>
      )}

      <nav className={styles.tabs} aria-label="Match summary views">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            className={`${styles.tabButton} ${
              tab === item ? styles.activeTab : ""
            }`}
            onClick={() => setTab(item)}
          >
            {formatName(item)}
          </button>
        ))}
      </nav>

      {tab === "summary" && <MatchSummaryTab match={match} />}
      {tab === "scorecard" && <Scorecard match={match} />}
      {tab === "overs" && <OversTimeline match={match} />}
      {tab === "insights" &&
        (hasBallData ? (
          <InsightsTab match={match} />
        ) : (
          <div className={styles.emptyInsights}>
            <strong>No ball-by-ball data</strong>
            <span>Insights are available only for newer matches.</span>
          </div>
        ))}
    </main>
  );
}
