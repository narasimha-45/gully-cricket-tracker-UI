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

    navigate(`/season/${match.matchInfo.seasonId}/matches`);
  };

  useEffect(() => {
    const loadMatch = async () => {
      try {
        const res = await fetch(`${API}/api/matches/${matchId}`);
        const data = await res.json();
        setMatch(data.data);
      } catch (err) {
        console.error("Failed to load match", err);
      } finally {
        setLoading(false);
      }
    };

    loadMatch();
  }, [matchId]);

  if (loading) {
    return <p style={{ color: "#6b7280" }}>Loading scorecard…</p>;
  }

  if (!match) {
    return <p style={{ color: "#dc2626" }}>Match not found</p>;
  }

  const { matchInfo, innings, manOfTheMatch } = match;

  const { teams, toss, result, totalOvers, seasonId } = matchInfo;

  const goBackToSeason = () => {
    navigate(`/season/${match.matchInfo.seasonId}/matches`);
  };

  return (
    <div style={page}>
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
        <div style={title}>
          {teams.teamA.name} vs {teams.teamB.name}
        </div>

        <div style={resultText}>
          {result.winner} won by {result.margin}{" "}
          {result.type === "RUNS" ? "runs" : "wickets"}
        </div>

        {manOfTheMatch && (
          <div style={momBadge}>
            ⭐ Man of the Match: <strong>{manOfTheMatch}</strong>
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

/* ---------------- HELPERS ---------------- */

function formatDismissal(d) {
  switch (d.type) {
    case "BOWLED":
      return `b ${d.bowler}`;
    case "CAUGHT":
      return `c ${d.fielder} b ${d.bowler}`;
    case "LBW":
      return `lbw b ${d.bowler}`;
    case "STUMPED":
      return `st ${d.fielder} b ${d.bowler}`;
    case "RUN_OUT":
      return d.fielder ? `run out (${d.fielder})` : "run out";
    default:
      return d.type.toLowerCase();
  }
}

/* ---------------- STYLES ---------------- */

const topBar = {
  display: "flex",

  justifyContent: "space-between",

  alignItems: "center",
};

const replayBtn = {
  border: "none",

  background: "#eef2ff",

  color: "#4338ca",

  height: 36,

  padding: "0 14px",

  borderRadius: 999,

  fontSize: 14,

  fontWeight: 700,

  cursor: "pointer",

  display: "flex",

  alignItems: "center",

  justifyContent: "center",

  gap: 6,
};
const actionRow = {
  marginTop: 18,
};

const playAgainBtn = {
  width: "100%",

  height: 56,

  border: "none",

  borderRadius: 18,

  background: "linear-gradient(135deg,#4f46e5,#4338ca)",

  color: "#fff",

  fontSize: 16,

  fontWeight: 700,

  cursor: "pointer",

  display: "flex",

  alignItems: "center",

  justifyContent: "center",

  gap: 10,

  boxShadow: "0 10px 28px rgba(67,56,202,0.22)",

  transition: "0.2s ease",
};

const playAgainIcon = {
  fontSize: 20,

  fontWeight: 400,
};

const page = {
  display: "flex",
  flexDirection: "column",
  gap: 18,

  paddingBottom: 30,
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
const headerCard = {
  background: "linear-gradient(135deg,#312e81,#4338ca)",

  borderRadius: 22,

  padding: 22,

  color: "#fff",

  boxShadow: "0 10px 28px rgba(67,56,202,0.22)",
};

const title = {
  fontSize: 22,

  fontWeight: 800,

  lineHeight: 1.3,
};

const resultText = {
  marginTop: 12,

  fontSize: 16,

  fontWeight: 600,

  color: "#e0e7ff",

  lineHeight: 1.5,
};

const momBadge = {
  marginTop: 16,

  display: "inline-flex",

  alignItems: "center",

  gap: 8,

  padding: "10px 14px",

  borderRadius: 999,

  background: "rgba(255,255,255,0.16)",

  backdropFilter: "blur(10px)",

  color: "#fff",

  fontSize: 14,

  fontWeight: 700,
};
