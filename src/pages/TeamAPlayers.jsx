import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMatch, saveMatch } from "../storage/matchDB";

export default function TeamAPlayers() {
  const { seasonId, matchId } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    const loadMatch = async () => {
      try {
        const m = await getMatch(matchId);

        if (!m) {
          console.error("Match not found in IndexedDB:", matchId);
          setLoading(false);
          return;
        }

        setMatch(m);
      } catch (err) {
        console.error("Failed to load match", err);
      } finally {
        setLoading(false);
      }
    };

    loadMatch();
  }, [matchId]);

  if (loading) {
    return <p style={{ color: "#6b7280" }}>Loading match…</p>;
  }

  if (!match) {
    return <p style={{ color: "#dc2626" }}>Match not found</p>;
  }

  const players = match.teams.teamA.players;

  const addPlayer = async () => {
    if (!playerName.trim()) return;

    const updated = {
      ...match,
      teams: {
        ...match.teams,
        teamA: {
          ...match.teams.teamA,
          players: [...players, playerName.trim()],
        },
      },
      updatedAt: Date.now(),
    };

    await saveMatch(updated);
    setMatch(updated);
    setPlayerName("");
  };

  const removePlayer = async (index) => {
    const updated = {
      ...match,
      teams: {
        ...match.teams,
        teamA: {
          ...match.teams.teamA,
          players: players.filter((_, i) => i !== index),
        },
      },
      updatedAt: Date.now(),
    };

    await saveMatch(updated);
    setMatch(updated);
  };

  return (
    <div>
      {/* Back */}
      <button onClick={() => navigate(-1)} style={backBtn}>
        ← Back
      </button>

      <h2 style={title}>Add Players – {match.teams.teamA.name}</h2>

      {/* Players list */}
      <div style={{ marginBottom: 16 }}>
        {players.length === 0 && (
          <p style={muted}>No players added yet</p>
        )}

        {players.map((p, i) => (
          <div key={i} style={playerRow}>
            <span>{p}</span>
            <button
              onClick={() => removePlayer(i)}
              style={removeBtn}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Add player */}
      <div style={addRow}>
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Player name"
          style={input}
        />
        <button onClick={addPlayer} style={addBtn}>
          Add
        </button>
      </div>

      {/* Next */}
      <button
        onClick={() =>
          navigate(
            `/season/${seasonId}/match/${matchId}/setup/team-b`,{ replace: true }
          )
        }
        style={nextBtn}
        disabled={players.length === 0}
      >
        Next → Team B
      </button>
    </div>
  );
}

/* ---------------- styles ---------------- */

const backBtn = {
  background: "none",
  border: "none",
  color: "#4f46e5",
  fontWeight: 600,
  marginBottom: 12,
  cursor: "pointer",
};

const title = {
  textAlign: "center",
  marginBottom: 20,
};

const muted = {
  color: "#6b7280",
  fontSize: 14,
};

const playerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  marginBottom: 8,
};

const removeBtn = {
  background: "none",
  border: "none",
  fontSize: 16,
  cursor: "pointer",
};

const addRow = {
  display: "flex",
  gap: 8,
  marginBottom: 24,
};

const input = {
  flex: 1,
  padding: "10px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const addBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#4f46e5",
  color: "#fff",
  fontWeight: 600,
};

const nextBtn = {
  width: "100%",
  padding: "14px",
  borderRadius: 12,
  border: "none",
  background: "#4f46e5",
  color: "#fff",
  fontWeight: 600,
};
