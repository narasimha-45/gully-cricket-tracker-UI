import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMatch, saveMatch } from "../storage/matchDB";

export default function SelectStriker() {
  const { matchId } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const m = await getMatch(matchId);
      if (!m) {
        setLoading(false);
        return;
      }

      // Defensive init
      const updated = {
        ...m,
        live: {
          ...m.live,
          outBatsmen: m.live.outBatsmen || [],
          history: m.live.history || [],
        },
      };

      setMatch(updated);
      setLoading(false);
    };

    load();
  }, [matchId]);

  if (loading) return <p>Loading…</p>;
  if (!match) return <p>Match not found</p>;

  const live = match.live;
  const battingTeam = match.teams[live.battingTeam];

  /* ---------------- VALID PLAYERS ---------------- */

  const validPlayers = battingTeam.players.filter(
    (p) =>
      !live.outBatsmen.includes(p) &&
      p !== live.nonStriker
  );

  /* ---------------- SELECT STRIKER ---------------- */

  const selectStriker = async (player) => {
    const snapshot = JSON.parse(JSON.stringify(live));

    const updated = {
      ...match,
      live: {
        ...live,
        striker: player,
        history: [...live.history, snapshot],
      },
      updatedAt: Date.now(),
    };

    await saveMatch(updated);
    navigate(-1); // back to LiveMatch
  };

  return (
    <div>
      <h2 style={title}>Select Striker</h2>

      {validPlayers.length === 0 && (
        <p style={muted}>No eligible batsmen</p>
      )}

      <div style={list}>
        {validPlayers.map((p) => (
          <button
            key={p}
            style={playerBtn}
            onClick={() => selectStriker(p)}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- styles ---------------- */

const title = {
  textAlign: "center",
  marginBottom: 20,
};

const muted = {
  color: "#6b7280",
  textAlign: "center",
};

const list = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const playerBtn = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
};
