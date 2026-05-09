import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { saveMatch } from "../storage/matchDB";

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
      seasonId: match.seasonId,

      matchType: match.matchType,
      totalOvers: match.totalOvers,
      rules: match.rules,

      teams: {
        teamA: {
          name: match.teams.teamA.name,
          players: [...match.teams.teamA.players],
        },
        teamB: {
          name: match.teams.teamB.name,
          players: [...match.teams.teamB.players],
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

  useEffect(() => {
    const loadMatch = async () => {
      try {
        const res = await fetch(`${API}/api/matches/${matchId}`);
        const data = await res.json();
        setMatch(data);
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

  const { teams, toss, result, innings, totalOvers } = match;
  // console.log("Match",result,match)

  const manOfTheMatch = result?.manOfTheMatch;

  const goBackToSeason = () => {
    navigate(`/season/${match.seasonId}/matches`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <button onClick={goBackToSeason} style={backBtn}>
        ← Back to Season
      </button>
      {/* ---------------- MATCH HEADER ---------------- */}
      <div style={headerCard}>
        <div style={title}>
          {teams.teamA.name} vs {teams.teamB.name}
        </div>

        {toss && (
          <div style={muted}>
            Toss: {toss.winner} chose to {toss.decision}
          </div>
        )}

        {result && (
          <div style={resultText}>
            {result.winner} won by {result.margin}{" "}
            {result.type === "RUNS" ? "runs" : "wickets"}
          </div>
        )}

        {manOfTheMatch && (
          <div style={momBadge}>
            ⭐ Man of the Match: <strong>{manOfTheMatch}</strong>
          </div>
        )}
      </div>

      {/* ---------------- INNINGS ---------------- */}
      {innings.map((inn, idx) => {
        const overs = `${Math.floor(inn.balls / 6)}.${inn.balls % 6}`;
        const rr =
          inn.balls === 0
            ? "0.00"
            : (inn.totalRuns / (inn.balls / 6)).toFixed(2);

        const teamPlayers =
          inn.battingTeam === teams.teamA.name
            ? teams.teamA.players
            : teams.teamB.players;

        const batters = Object.keys(inn.battingStats || {});
        const didNotBat = teamPlayers.filter((p) => !batters.includes(p));

        return (
          <div key={idx} style={card}>
            {/* Innings header */}
            <div style={{ marginBottom: 10 }}>
              <div style={inningsTitle}>
                {inn.battingTeam} {inn.totalRuns}/{inn.wickets}
              </div>
              <div style={muted}>
                Overs {overs}
                {totalOvers ? ` / ${totalOvers}` : ""} · RR {rr}
              </div>
            </div>

            {/* -------- Batting -------- */}
            <div style={sectionTitle}>Batting</div>

            <div style={tableHeader}>
              <span>Batter</span>
              <span>R</span>
              <span>B</span>
              <span>4s</span>
              <span>6s</span>
              <span>SR</span>
            </div>

            {batters.map((p) => {
              const s = inn.battingStats[p];
              const sr =
                s.balls === 0 ? "0.0" : ((s.runs / s.balls) * 100).toFixed(1);

              return (
                <div key={p} style={row}>
                  <span>
                    <div style={playerName}>{p}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: s.dismissal ? "#6b7280" : "#16a34a",
                      }}
                    >
                      {s.dismissal ? formatDismissal(s.dismissal) : "not out"}
                    </div>
                  </span>

                  <span>{s.runs}</span>
                  <span>{s.balls}</span>
                  <span>{s.fours}</span>
                  <span>{s.sixes}</span>
                  <span>{sr}</span>
                </div>
              );
            })}

            {didNotBat.length > 0 && (
              <div style={didNotBatStyle}>
                <strong>Did not bat:</strong> {didNotBat.join(", ")}
              </div>
            )}

            {/* -------- Extras -------- */}
            <div style={extrasRow}>
              Extras: {(inn.extras?.wides || 0) + (inn.extras?.noBalls || 0)}{" "}
              (Wd {inn.extras?.wides || 0}, Nb {inn.extras?.noBalls || 0})
            </div>

            {/* -------- Bowling -------- */}
            <div style={sectionTitle}>Bowling</div>

            <div style={tableHeader}>
              <span>Bowler</span>
              <span>O</span>
              <span>M</span>
              <span>R</span>
              <span>W</span>
              <span>Eco</span>
            </div>

            {Object.keys(inn.bowlingStats || {}).map((b) => {
              const s = inn.bowlingStats[b];
              const o = `${Math.floor(s.balls / 6)}.${s.balls % 6}`;
              const eco =
                s.balls === 0 ? "0.00" : (s.runs / (s.balls / 6)).toFixed(2);

              return (
                <div key={b} style={row}>
                  <span style={playerName}>{b}</span>
                  <span>{o}</span>
                  <span>{s.maidens}</span>
                  <span>{s.runs}</span>
                  <span>{s.wickets}</span>
                  <span>{eco}</span>
                </div>
              );
            })}
          </div>
        );
      })}
      {/* ---------------- PLAY AGAIN (ONCE) ---------------- */}
      {result && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 20,
          }}
        >
          <button onClick={playAgain} style={playAgainBtn}>
            🔁 Play Again (Go to Toss)
          </button>
        </div>
      )}
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

const momBadge = {
  display: "inline-block",
  marginTop: 8,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#facc15", // gold
  color: "#78350f",
  fontSize: 12,
  fontWeight: 700,
};


const backBtn = {
  alignSelf: "flex-start",
  background: "none",
  border: "none",
  color: "#4f46e5",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};

const headerCard = {
  background: "#eef2ff",
  padding: 14,
  borderRadius: 14,
};

const title = {
  fontSize: 18,
  fontWeight: 700,
};

const resultText = {
  marginTop: 6,
  fontWeight: 600,
};

const playAgainBtn = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "none",
  background: "#4f46e5",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const card = {
  background: "#ffffff",
  padding: 14,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
};

const inningsTitle = {
  fontSize: 16,
  fontWeight: 700,
};

const sectionTitle = {
  fontWeight: 600,
  marginTop: 12,
  marginBottom: 6,
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(5,1fr)",
  fontSize: 12,
  color: "#6b7280",
  fontWeight: 600,
  paddingBottom: 6,
  borderBottom: "1px solid #e5e7eb",
};

const row = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(5,1fr)",
  padding: "8px 0",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 14,
};

const playerName = {
  fontWeight: 600,
};

const muted = {
  fontSize: 13,
  color: "#6b7280",
};

const didNotBatStyle = {
  marginTop: 8,
  fontSize: 13,
  color: "#6b7280",
};

const extrasRow = {
  marginTop: 8,
  fontWeight: 600,
  fontSize: 14,
};
