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
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState(null); // "heads" | "tails"

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

  const flipCoin = () => {
    if (isFlipping) return;

    setIsFlipping(true);
    setFlipResult(null);

    // Simulate coin flip animation
    setTimeout(() => {
      const result = Math.random() <= 0.5 ? "heads" : "tails";

      setTimeout(() => {
        setFlipResult(result);
        setIsFlipping(false);
      }, 200);
    }, 2000); // Faster: 1.5 second flip animation
  };

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
    <div style={container}>
      <style>
        {`
          @keyframes flip {
            0% {
              transform: rotateY(0deg);
            }

            100% {
              transform: rotateY(2880deg);
            }
          }
          @keyframes bounce {
            0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
            40%, 43% { transform: translate3d(0, -8px, 0); }
            70% { transform: translate3d(0, -4px, 0); }
            90% { transform: translate3d(0, -2px, 0); }
          }
        `}
      </style>
      {/* Header */}
      <div style={headerCard}>
        <h2 style={title}>🏏 TOSS 🔴</h2>
        <p style={sub}>
          {teamAName} vs {teamBName}
        </p>
      </div>
      {/* Coin Flip */}
      <div style={card}>
        <p style={label}>Flip a coin </p>

        <div style={coinContainer}>
          <div
            style={{
              ...coin,
              animation: isFlipping ? "flip 2s ease-in-out" : "none",
              transform:
                flipResult === "tails" ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
            onClick={flipCoin}
          >
            <div style={coinFace}>
              <span style={{ fontSize: 24 }}>🪙</span>
              <div style={coinText}>Heads</div>
            </div>
            <div style={{ ...coinFace, transform: "rotateY(180deg)" }}>
              <span style={{ fontSize: 24 }}>🪙</span>
              <div style={coinText}>Tails</div>
            </div>
          </div>
        </div>

        {/* {flipResult && (
          <div style={resultText}>
            🎉 {flipResult.charAt(0).toUpperCase() + flipResult.slice(1)}!
          </div>
        )} */}

        <button style={flipBtn} onClick={flipCoin} disabled={isFlipping}>
          {isFlipping ? "Flipping..." : " Flip Coin"}
        </button>
      </div>
      {/* Toss Winner */}
      <div style={card}>
        <span style={icon}>🎯</span>

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
        <div style={card}>
          {/* <div style={iconContainer}> */}
          <span style={icon}>⚡</span>
          {/* </div> */}
          <p style={label}>What did they choose?</p>
          <div style={row}>
            <button
              style={pill(decision === "bat")}
              onClick={() => setDecision("bat")}
            >
              🏏 Bat First
            </button>

            <button
              style={pill(decision === "bowl")}
              onClick={() => setDecision("bowl")}
            >
              🔴 Bowl First
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
          transform: canProceed ? "scale(1)" : "scale(0.98)",
        }}
      >
        Start Match
      </button>
    </div>
  );
}

/* ---------------- styles ---------------- */

const container = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "24px 16px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  maxWidth: 420,
  margin: "0 auto",
};

const headerCard = {
  background: "#ffffff",
  backgroundImage:
    "url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 120 120\'%3E%3Ccircle cx=\'90\' cy=\'32\' r=\'18\' fill=\'%23f59e0b\' opacity=\'0.2\'/%3E%3Cpath d=\'M18 88l56-44 18 18-56 44z\' fill=\'%234f46e5\' opacity=\'0.12\'/%3E%3Cpath d=\'M66 74l24-22 6 6-24 22z\' fill=\'%236d28d9\' opacity=\'0.18\'/%3E%3C/svg%3E')",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "calc(100% - 18px) 16px",
  backgroundSize: "96px 96px",
  borderRadius: 18,
  padding: "22px 18px",
  marginBottom: 18,
  textAlign: "center",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e2e8f0",
};

const card = {
  background: "#ffffff",
  borderRadius: 16,
  padding: "18px",
  marginBottom: 16,
  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.05)",
  border: "1px solid #e2e8f0",
  textAlign: "center",
};

const iconContainer = {
  marginBottom: 10,
};

const icon = {
  fontSize: 28,
  display: "block",
};

const title = {
  marginBottom: 8,
  color: "#0f172a",
  fontSize: 28,
  fontWeight: 700,
  margin: 0,
};

const sub = {
  color: "#3259cccb",
  marginBottom: 0,
  fontSize: 24,
  fontWeight: 700,
};

const label = {
  fontWeight: 600,
  marginBottom: 16,
  color: "#334155",
  fontSize: 15,
};

const row = {
  display: "flex",
  gap: 12,
  marginTop: 8,
};

const pill = (active) => ({
  flex: 1,
  padding: "14px 16px",
  borderRadius: 12,
  border: active ? "1px solid #4f46e5" : "1px solid #cbd5e1",
  cursor: "pointer",
  background: active ? "#4f46e5" : "#ffffff",
  color: active ? "#fff" : "#334155",
  fontWeight: 600,
  fontSize: 14,
  transition: "all 0.2s ease",
  boxShadow: active ? "0 8px 20px rgba(79, 70, 229, 0.12)" : "none",
  transform: active ? "translateY(-1px)" : "translateY(0)",
});

const primaryBtn = {
  width: "100%",
  padding: "16px",
  borderRadius: 12,
  border: "none",
  background: "#4f46e5",
  color: "#fff",
  fontWeight: 700,
  fontSize: 16,
  cursor: "pointer",
  transition: "all 0.15s ease",
  boxShadow: "0 10px 20px rgba(79, 70, 229, 0.16)",
  marginTop: 8,
};

/* Coin flip styles */
const coinContainer = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 16,
};

const coin = {
  width: 80,
  height: 80,
  position: "relative",
  cursor: "pointer",
  transformStyle: "preserve-3d",
};

const coinFace = {
  position: "absolute",
  width: "100%",
  height: "100%",
  backfaceVisibility: "hidden",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(145deg, #fbbf24, #f59e0b)",
  borderRadius: "50%",
  border: "3px solid #d97706",
  boxShadow: "0 8px 16px rgba(245, 158, 11, 0.3)",
};

const coinText = {
  fontSize: 12,
  fontWeight: 700,
  color: "#92400e",
  marginTop: 4,
};

const resultText = {
  fontSize: 16,
  fontWeight: 700,
  color: "#059669",
  marginBottom: 16,
  animation: "bounce 0.6s ease",
};

const flipBtn = {
  width: "100%",
  padding: "12px",
  borderRadius: 10,
  border: "none",
  background: "#f59e0b",
  color: "#92400e",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
};
