import { useState } from "react";
import BottomSheet from "./BottomSheet";
import { saveMatch } from "../storage/matchDB";

export default function EditMatchSheet({ open, onClose, match, onSave }) {
  const { live } = match;

  const [openTeam, setOpenTeam] = useState(null); // teamA | teamB
  const [newPlayer, setNewPlayer] = useState("");
  const [overs, setOvers] = useState(match.totalOvers || 0);

  /* ---------------- SAFETY CHECK ---------------- */

  const isPlayerLocked = (player) => {
    const innings = match.innings[live.inningsIndex];

    return (
      live.striker === player ||
      live.nonStriker === player ||
      live.bowler === player ||
      live.outBatsmen.includes(player) ||
      innings.battingStats[player] ||
      innings.bowlingStats[player]
    );
  };

  /* ---------------- TEAM OPS ---------------- */

  const addPlayer = (teamKey) => {
    if (!newPlayer.trim()) return;

    const updated = {
      ...match,
      teams: {
        ...match.teams,
        [teamKey]: {
          ...match.teams[teamKey],
          players: [...match.teams[teamKey].players, newPlayer.trim()],
        },
      },
      updatedAt: Date.now(),
    };

    save(updated);
    setNewPlayer("");
  };

  const removePlayer = (teamKey, player) => {
    if (isPlayerLocked(player)) return;

    const updated = {
      ...match,
      teams: {
        ...match.teams,
        [teamKey]: {
          ...match.teams[teamKey],
          players: match.teams[teamKey].players.filter((p) => p !== player),
        },
      },
      updatedAt: Date.now(),
    };

    save(updated);
  };

  /* ---------------- OVERS ---------------- */

  const updateOvers = (delta) => {
    const next = overs + delta;
    if (next < Math.ceil(match.innings[live.inningsIndex].balls / 6)) return;

    setOvers(next);
  };

  /* ---------------- SAVE ---------------- */

  const save = (updated) => {
    saveMatch(updated);
    onSave(updated);
  };

  const applyOvers = () => {
    const updated = {
      ...match,
      totalOvers: overs,
      updatedAt: Date.now(),
    };
    save(updated);
  };

    const rules = match.rules || {
    wide: { extraRun: false, extraBall: true },
    noBall: { extraRun: true, extraBall: true },
  };

  const updateRules = (partial) => {
    const updated = {
      ...match,
      rules: {
        ...rules,
        ...partial,
      },
      updatedAt: Date.now(),
    };

    saveMatch(updated);
    onSave(updated);
  };

  /* ---------------- UI ---------------- */

  return (
    <BottomSheet open={open} title="Edit Match" onClose={onClose}>
      {/* OVERS */}
      <div style={section}>
        <p style={label}>Overs</p>
        <div style={oversRow}>
          <button onClick={() => updateOvers(-1)}>-</button>
          <span style={oversValue}>{overs}</span>
          <button onClick={() => updateOvers(1)}>+</button>
        </div>

        <button style={saveBtn} onClick={applyOvers}>
          Update Overs
        </button>
      </div>

      <h4>Extras Rules</h4>

      <div style={settingsRow}>
        <span>Wide gives run</span>
        <input
          type="checkbox"
          checked={rules.wide.extraRun}
          onChange={(e) =>
            updateRules({
              wide: { ...rules.wide, extraRun: e.target.checked },
            })
          }
        />
      </div>

      <div style={settingsRow}>
        <span>No Ball gives run</span>
        <input
          type="checkbox"
          checked={rules.noBall.extraRun}
          onChange={(e) =>
            updateRules({
              noBall: { ...rules.noBall, extraRun: e.target.checked },
            })
          }
        />
      </div>

      {/* TEAM A */}
      <TeamEditor
        teamKey="teamA"
        openTeam={openTeam}
        setOpenTeam={setOpenTeam}
        match={match}
        isPlayerLocked={isPlayerLocked}
        removePlayer={removePlayer}
        addPlayer={addPlayer}
        newPlayer={newPlayer}
        setNewPlayer={setNewPlayer}
      />

      {/* TEAM B */}
      <TeamEditor
        teamKey="teamB"
        openTeam={openTeam}
        setOpenTeam={setOpenTeam}
        match={match}
        isPlayerLocked={isPlayerLocked}
        removePlayer={removePlayer}
        addPlayer={addPlayer}
        newPlayer={newPlayer}
        setNewPlayer={setNewPlayer}
      />
    </BottomSheet>
  );
}

const settingsRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 0",
  touchAction: "manipulation",
};

/* ---------------- TEAM EDITOR ---------------- */

function TeamEditor({
  teamKey,
  openTeam,
  setOpenTeam,
  match,
  isPlayerLocked,
  removePlayer,
  addPlayer,
  newPlayer,
  setNewPlayer,
}) {
  const team = match.teams[teamKey];



  return (
    <div style={section}>
      <div
        style={teamHeader}
        onClick={() => setOpenTeam(openTeam === teamKey ? null : teamKey)}
      >
        <strong>{team.name}</strong>
        <span>{openTeam === teamKey ? "▲" : "▼"}</span>
      </div>

      {openTeam === teamKey && (
        <>
          {team.players.map((p) => {
            const locked = isPlayerLocked(p);

            return (
              <div key={p} style={playerRow}>
                <span style={{ opacity: locked ? 0.5 : 1 }}>{p}</span>
                {locked ? (
                  <span style={lock}>🔒</span>
                ) : (
                  <button
                    style={removeBtn}
                    onClick={() => removePlayer(teamKey, p)}
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}

          <div style={addRow}>
            <input
              placeholder="New player"
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
            />
            <button onClick={() => addPlayer(teamKey)}>Add</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const section = { marginBottom: 16 };

const label = { fontWeight: 600, marginBottom: 6 };

const oversRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
};



const oversValue = { fontWeight: 700, fontSize: 18 };

const saveBtn = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "none",
  background: "#4f46e5",
  color: "#fff",
  fontWeight: 600,
};

const teamHeader = {
  display: "flex",
  justifyContent: "space-between",
  cursor: "pointer",
  fontWeight: 600,
};

const playerRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 0",
};

const removeBtn = {
  background: "none",
  border: "none",
  color: "#dc2626",
  cursor: "pointer",
};

const addRow = {
  display: "flex",
  gap: 8,
  marginTop: 8,
};

const lock = { fontSize: 14 };
