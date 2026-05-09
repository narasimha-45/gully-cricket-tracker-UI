import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMatch, saveMatch } from "../storage/matchDB";

export default function TossPage() {
  const { seasonId, matchId } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  const [wonBy, setWonBy] = useState(null); // "teamA" | "teamB"
  const [decision, setDecision] = useState(null); // "bat" | "bowl"

  useEffect(() => {
    const loadMatch = async () => {
      const m = await getMatch(matchId);
      if (!m) {
        setLoading(false);
        return;
      }
      setMatch(m);
      setLoading(false);
    };

    loadMatch();
  }, [matchId]);

  if (loading) return <p>Loading toss...</p>;
  if (!match) return <p>Match not found</p>;

  const teamAName = match.teams.teamA.name;
  const teamBName = match.teams.teamB.name;

  const canProceed = wonBy && decision;

  const handleProceed = async () => {
    if (!canProceed) return;

    const battingFirst =
      decision === "bat" ? wonBy : wonBy === teamAName ? teamBName : teamAName;

    const bowlingFirst = battingFirst === teamAName ? teamBName : teamAName;

    const updatedMatch = {
      ...match,

      status: "LIVE",

      toss: {
        winner: wonBy,
        decision,
      },

      innings: [
        {
          battingTeam: battingFirst,
          bowlingTeam: bowlingFirst,

          totalRuns: 0,
          wickets: 0,
          balls: 0,

          battingStats: {},
          bowlingStats: {},
          thisOver: [],

          extras: {
            wides: 0,
            noBalls: 0,
          },
        },
      ],

      live: {
        inningsIndex: 0,

        striker: null,
        nonStriker: null,
        bowler: null,

        outBatsmen: [],
        lastOverBowler: null,

        history: [],

        thisOver: [],
      },
      


      updatedAt: Date.now(),
    };

    await saveMatch(updatedMatch);

    navigate(`/season/${seasonId}/match/${matchId}/live`, { replace: true });
  };

  return (
    <div>
      {/* Header */}
      <h2 style={title}>Toss</h2>
      <p style={sub}>
        {teamAName} vs {teamBName}
      </p>

      {/* Toss Winner */}
      <div style={section}>
        <p style={label}>Who won the toss?</p>

        <div style={row}>
          <button
            style={pill(wonBy === teamAName)}
            onClick={() => setWonBy(teamAName)}
          >
            {teamAName}
          </button>

          <button
            style={pill(wonBy === teamBName)}
            onClick={() => setWonBy(teamBName)}
          >
            {teamBName}
          </button>
        </div>
      </div>

      {/* Decision */}
      {wonBy && (
        <div style={section}>
          <p style={label}>What did they choose?</p>

          <div style={row}>
            <button
              style={pill(decision === "bat")}
              onClick={() => setDecision("bat")}
            >
              Bat
            </button>

            <button
              style={pill(decision === "bowl")}
              onClick={() => setDecision("bowl")}
            >
              Bowl
            </button>
          </div>
        </div>
      )}

      {/* Start Match */}
      <button
        disabled={!canProceed}
        onClick={handleProceed}
        style={{
          ...primaryBtn,
          opacity: canProceed ? 1 : 0.5,
        }}
      >
        Start Match
      </button>
    </div>
  );
}

/* ---------------- styles ---------------- */

const title = {
  textAlign: "center",
  marginBottom: 4,
};

const sub = {
  fontWeight: "bold",
  textAlign: "center",
  color: "#6b7280",
  marginBottom: 24,
  fontSize: 26,
};

const section = {
  marginBottom: 24,
};

const label = {
  fontWeight: 600,
  marginBottom: 8,
};

const row = {
  display: "flex",
  gap: 10,
};

const pill = (active) => ({
  flex: 1,
  padding: "12px",
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  background: active ? "#4f46e5" : "#eef2ff",
  color: active ? "#fff" : "#1e1b4b",
  fontWeight: 600,
});

const primaryBtn = {
  width: "100%",
  padding: "14px",
  borderRadius: 12,
  border: "none",
  background: "#4f46e5",
  color: "#fff",
  fontWeight: 600,
};
