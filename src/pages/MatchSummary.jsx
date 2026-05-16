import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { saveMatch } from "../storage/matchDB";

import Scorecard from "../components/Scorecard";

export default function MatchSummary() {
  const { matchId } = useParams();

  const [match, setMatch] = useState(null);

  const [loading, setLoading] = useState(true);

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

  const { matchInfo, innings, manOfTheMatch } = match;

  const { teams, toss, result, totalOvers } = matchInfo;

  /* =====================================
     BACK
  ===================================== */

  const goBackToSeason = () => {
    navigate(-1);
  };

  /* =====================================
     UI
  ===================================== */

  return (
    <div style={page}>
      {/* TOP BAR */}

      <div style={topBar}>
        <button onClick={goBackToSeason} style={backBtn}>
          ← Back
        </button>

        <button onClick={playAgain} style={replayBtn}>
          ↻ Replay
        </button>
      </div>

      {/* RESULT CARD */}

      <div style={headerCard}>
        <div style={liveBadge}>COMPLETED</div>

        <div style={title}>
          {teams.teamA.name} vs {teams.teamB.name}
        </div>

        <div style={resultText}>
          {result.winner} won by {result.margin}{" "}
          {result.type === "RUNS" ? "runs" : "wickets"}
        </div>

        {manOfTheMatch && (
          <div style={momBadge}>
            ⭐ Man of the Match:
            <strong>{manOfTheMatch}</strong>
          </div>
        )}
      </div>

      {/* SCORECARD */}

      <Scorecard
        match={{
          ...match.matchInfo,
          innings,
        }}
      />
    </div>
  );
}

/* =========================================
   STYLES
========================================= */

const page = {
  display: "flex",

  flexDirection: "column",

  gap: 18,

  paddingBottom: 30,
};

/* =====================================
   TOP BAR
===================================== */

const topBar = {
  display: "flex",

  justifyContent: "space-between",

  alignItems: "center",
};

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
   HEADER CARD
===================================== */

const headerCard = {
  background: "linear-gradient(135deg,#312e81,#4338ca)",

  borderRadius: 24,

  padding: 24,

  color: "#fff",

  boxShadow: "0 12px 30px rgba(67,56,202,0.25)",

  position: "relative",

  overflow: "hidden",
};

const liveBadge = {
  display: "inline-flex",

  alignItems: "center",

  justifyContent: "center",

  padding: "6px 12px",

  borderRadius: 999,

  background: "rgba(255,255,255,0.16)",

  backdropFilter: "blur(8px)",

  fontSize: 12,

  fontWeight: 800,

  letterSpacing: 0.5,

  marginBottom: 16,
};

const title = {
  fontSize: 24,

  fontWeight: 800,

  lineHeight: 1.3,
};

const resultText = {
  marginTop: 14,

  fontSize: 16,

  fontWeight: 600,

  color: "#e0e7ff",

  lineHeight: 1.5,
};

const momBadge = {
  marginTop: 18,

  display: "inline-flex",

  alignItems: "center",

  gap: 8,

  padding: "10px 16px",

  borderRadius: 999,

  background: "rgba(255,255,255,0.16)",

  backdropFilter: "blur(10px)",

  color: "#fff",

  fontSize: 14,

  fontWeight: 700,
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

  animation: "pulse 1.8s ease-in-out infinite",
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

  animation: "loadingBar 1.4s ease-in-out infinite",
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
