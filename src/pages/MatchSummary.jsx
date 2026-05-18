import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { saveMatch } from "../storage/matchDB";

import MatchSummaryTab from "../components/MatchSummaryTab";
import Scorecard from "../components/Scorecard";
import OversTimeline from "../components/OversTimeline";

import styles from "./LiveMatch.module.css";
import { formatName } from "../utils/helpers";
import InsightsTab from "../components/Insightstab";

export default function MatchSummary() {
  const { matchId } = useParams();

  const [match, setMatch] = useState(null);

  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("summary");

  const navigate = useNavigate();

  const API = import.meta.env.VITE_API_BASE_URL;

  /* =====================================
     PLAY AGAIN
  ===================================== */

  const playAgain = async () => {
    const newMatchId = `match_${Date.now()}`;

    const newMatch = {
      id: newMatchId,

      seasonId: match.matchInfo.seasonId,

      matchType: match.matchInfo.matchType,

      totalOvers: match.matchInfo.totalOvers,

      rules: match.matchInfo.rules,

      teams: {
        teamA: {
          name: match.matchInfo.teams.teamA.name,
          players: [...match.matchInfo.teams.teamA.players],
        },

        teamB: {
          name: match.matchInfo.teams.teamB.name,
          players: [...match.matchInfo.teams.teamB.players],
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

    navigate(`/season/${match.matchInfo.seasonId}/match/${newMatchId}/toss`);
  };

  /* =====================================
     LOAD MATCH
  ===================================== */

  useEffect(() => {
    const loadMatch = async () => {
      try {
        const res = await fetch(`${API}/api/matches/${matchId}`);

        const data = await res.json();

        console.log("Match Data", data);
        window.scrollTo(0, 0);

        setMatch(data.data);
      } catch (err) {
        console.error("Failed to load match", err);
      } finally {
        setLoading(false);
      }
    };

    loadMatch();
  }, [matchId]);

  /* =====================================
     LOADING
  ===================================== */

  if (loading) {
    return (
      <div style={loadingPage}>
        <div style={loadingCard}>
          <div style={pulseIcon}>🏏</div>

          <div style={loadingTitle}>Getting Match Summary</div>

          <div style={loadingSub}>
            Loading scorecard, innings and match insights...
          </div>

          <div style={loaderTrack}>
            <div style={loaderBar}></div>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================
     ERROR
  ===================================== */

  if (!match) {
    return (
      <div style={errorWrap}>
        <div style={errorIcon}>❌</div>

        <div style={errorTitle}>Match not found</div>

        <div style={errorSub}>Unable to load this scorecard</div>
      </div>
    );
  }

  const { matchInfo, innings } = match;

  const result = match.result || match.matchInfo.result;

  const { teams } = matchInfo;

  /* =====================================
     HELPERS
  ===================================== */

  const goBackToSeason = () => {
    navigate(-1);
  };

  const completedMatch = {
    ...match.matchInfo,
    innings,
    result,
    live: match.live || null,
  };

  /* =====================================
     RESULT TEXT
  ===================================== */

  const resultText =
    result?.winner === "TIE"
      ? "Match Tied"
      : result?.type === "SUPER_OVER"
        ? `${formatName(result.winner)} won via Super Over`
        : `${formatName(result?.winner)} won by ${result?.margin} ${
            result?.type === "RUNS" ? "runs" : "wickets"
          }`;

  /* =====================================
     UI
  ===================================== */

  return (
    <div className={styles.page}>
      {/* TOP BAR */}
      <div className={styles.heroTop} style={{ marginBottom: 12 }}>
        <button onClick={goBackToSeason} style={backBtn}>
          ← Back
        </button>

        <button onClick={playAgain} style={replayBtn}>
          ↻ Replay
        </button>
      </div>
      {/* HERO */}
      <div className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div className={styles.titleRow}>
            <p className={styles.liveBadge}>● END</p>

            <h2 className={styles.matchTitle}>
              {formatName(teams.teamA.name)} vs {formatName(teams.teamB.name)}
            </h2>

            <span className={styles.heroFormatPill}>
              {matchInfo.matchType === "TEST"
                ? "Test"
                : `${matchInfo.totalOvers} Overs`}
            </span>
          </div>
        </div>

        {/* SCORE ROWS */}

        <div className={styles.heroScoreRows}>
          {innings.map((inn, idx) => (
            <div key={idx} className={styles.heroScoreRow}>
              <span>{formatName(inn.battingTeam)}</span>

              <span className={styles.heroScoreVal}>
                {inn.totalRuns}-{inn.wickets} ({Math.floor(inn.balls / 6)}.
                {inn.balls % 6})
              </span>
            </div>
          ))}
        </div>

        {/* RESULT */}

        <div className={styles.heroStatus}>
          <div className={styles.heroResultText}>{resultText}</div>
        </div>
      </div>
      {/* MOM */}
      {(match.manOfTheMatch || result?.manOfTheMatch) && (
        <div className={styles.motmCard}>
          <strong>🏆 Man of the Match</strong>

          <div style={{ marginTop: 6 }}>
            {formatName(match.manOfTheMatch) ||
              formatName(result?.manOfTheMatch)}
          </div>
        </div>
      )}
      {/* TABS */}
      <div className={styles.tabs}>
        {["summary", "scorecard", "overs", "insights"].map((t) => (
          <button
            key={t}
            className={`${styles.tabBtn} ${tab === t ? styles.activeTab : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      
      {/* SUMMARY */}
      {tab === "summary" && <MatchSummaryTab match={completedMatch} />}
      
      {/* SCORECARD */}
      {tab === "scorecard" && <Scorecard match={completedMatch} />}
      
      {/* OVERS */}
      {tab === "overs" && <OversTimeline match={completedMatch} />}

      {/* INSIGHTS */}
      {tab === "insights" &&
        (completedMatch.innings?.some(
          (inn) => inn.ballByBall && inn.ballByBall.length > 0,
        ) ? (
          <InsightsTab match={completedMatch} />
        ) : (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              padding: "42px 20px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#334155",
                marginBottom: 6,
              }}
            >
              No ball-by-ball data
            </p>

            <span
              style={{
                fontSize: 13,
                color: "#94a3b8",
              }}
            >
              Insights are available only for newer matches.
            </span>
          </div>
        ))}
    </div>
  );
}

/* =====================================
   TOP BAR
===================================== */

const backBtn = {
  border: "none",
  background: "transparent",
  color: "#4338ca",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  padding: 0,
};

const replayBtn = {
  border: "none",
  background: "#eef2ff",
  color: "#4338ca",
  height: 38,
  padding: "0 16px",
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

/* =====================================
   LOADING
===================================== */

const loadingPage = {
  minHeight: "60vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const loadingCard = {
  width: "100%",
  maxWidth: 420,
  background: "#ffffff",
  borderRadius: 28,
  padding: "38px 28px",
  boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
  border: "1px solid rgba(226,232,240,0.8)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
};

const pulseIcon = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  background: "linear-gradient(135deg,#eef2ff,#e0e7ff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 32,
  marginBottom: 22,
};

const loadingTitle = {
  fontSize: 22,
  fontWeight: 800,
  color: "#111827",
};

const loadingSub = {
  marginTop: 10,
  fontSize: 14,
  lineHeight: 1.6,
  color: "#6b7280",
};

const loaderTrack = {
  marginTop: 24,
  width: "100%",
  height: 8,
  borderRadius: 999,
  background: "#e5e7eb",
  overflow: "hidden",
};

const loaderBar = {
  width: "45%",
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg,#4f46e5,#6366f1)",
};

/* =====================================
   ERROR
===================================== */

const errorWrap = {
  minHeight: "50vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};

const errorIcon = {
  fontSize: 42,
};

const errorTitle = {
  marginTop: 14,
  fontSize: 22,
  fontWeight: 800,
  color: "#111827",
};

const errorSub = {
  marginTop: 8,
  fontSize: 14,
  color: "#6b7280",
};
