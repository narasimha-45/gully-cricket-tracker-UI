import { useState } from "react";
import { saveMatch } from "../storage/matchDB";
import BottomSheetSelector from "./BottomSheetSelector";

export default function EditMatchSheet({ open, onClose, match, onSave }) {
  const { live } = match;

  const [openTeam, setOpenTeam] = useState(null);
  const [newPlayer, setNewPlayer] = useState("");
  const [overs, setOvers] = useState(match.totalOvers || 0);

  const innings = match.innings[live.inningsIndex];

  /* ---------------- PLAYER LOCK ---------------- */

  const isPlayerLocked = (player) => {
    return (
      live.striker === player ||
      live.nonStriker === player ||
      live.bowler === player ||
      live.outBatsmen.includes(player) ||
      innings.battingStats[player] ||
      innings.bowlingStats[player]
    );
  };

  /* ---------------- SAVE ---------------- */

  const save = (updated) => {
    saveMatch(updated);
    onSave(updated);
  };

  /* ---------------- OVERS ---------------- */

  const minOversNeeded = Math.ceil(innings.balls / 6);

  const updateOvers = (delta) => {
    const next = overs + delta;

    // prevent invalid values
    if (next < minOversNeeded) return;

    // optional hard cap
    if (next > 50) return;

    setOvers(next);
  };

  const applyOvers = () => {
    if (overs < minOversNeeded) return;

    const updated = {
      ...match,
      totalOvers: overs,
      updatedAt: Date.now(),
    };

    save(updated);
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

  /* ---------------- RULES ---------------- */

  const rules = match.rules || {
    wide: {
      extraRun: false,
      extraBall: true,
    },
    noBall: {
      extraRun: true,
      extraBall: true,
    },
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

    save(updated);
  };

  /* ---------------- UI ---------------- */

  return (
    <BottomSheetSelector open={open} title="Match Settings" onClose={onClose}>
      {/* OVERS */}
      <div style={sectionCard}>
        <div style={sectionTitleRow}>
          <h3 style={sectionTitle}>Overs</h3>

          <span style={helperText}>Minimum: {minOversNeeded}</span>
        </div>

        <div style={oversContainer}>
          <button style={circleBtn} onClick={() => updateOvers(-1)}>
            −
          </button>

          <div style={oversBox}>
            <span style={oversValue}>{overs}</span>
            {/* <span style={oversLabel}>Overs</span> */}
          </div>

          <button style={circleBtn} onClick={() => updateOvers(1)}>
            +
          </button>
        </div>

        <button style={primaryBtn} onClick={applyOvers}>
          Update Overs
        </button>
      </div>

      {/* RULES */}
      <div style={sectionCard}>
        <h3 style={sectionTitle}>Extras Rules</h3>

        <div style={settingsRow}>
          <div>
            <div style={settingTitle}>Wide gives run</div>
            <div style={settingDesc}>Add automatic extra run on wide</div>
          </div>

          <input
            type="checkbox"
            style={{
              width: 20,
              height: 20,
              accentColor: "#4f46e5",
              cursor: "pointer",
            }}
            checked={rules.wide.extraRun}
            onChange={(e) =>
              updateRules({
                wide: {
                  ...rules.wide,
                  extraRun: e.target.checked,
                },
              })
            }
          />
        </div>

        <div style={divider}></div>

        <div style={settingsRow}>
          <div>
            <div style={settingTitle}>No Ball gives run</div>
            <div style={settingDesc}>Add automatic extra run on no ball</div>
          </div>

          <input
            type="checkbox"
            style={{
              width: 20,
              height: 20,
              accentColor: "#4f46e5",
              cursor: "pointer",
            }}
            checked={rules.noBall.extraRun}
            onChange={(e) =>
              updateRules({
                noBall: {
                  ...rules.noBall,
                  extraRun: e.target.checked,
                },
              })
            }
          />
        </div>
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
    </BottomSheetSelector>
  );
}

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

  const isOpen = openTeam === teamKey;

  return (
    <div style={sectionCard}>
      <div
        style={teamHeader}
        onClick={() => setOpenTeam(isOpen ? null : teamKey)}
      >
        <div>
          <div style={teamTitle}>{team.name}</div>

          <div style={teamSubText}>{team.players.length} players</div>
        </div>

        <span style={arrow}>{isOpen ? "▲" : "▼"}</span>
      </div>

      {isOpen && (
        <>
          <div style={{ marginTop: 12 }}>
            {team.players.map((p) => {
              const locked = isPlayerLocked(p);

              return (
                <div key={p} style={playerRow}>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        opacity: locked ? 0.6 : 1,
                      }}
                    >
                      {p}
                    </div>

                    {locked && (
                      <div style={lockedText}>Currently used in match</div>
                    )}
                  </div>

                  {locked ? (
                    <span style={lockBadge}>🔒 Locked</span>
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
          </div>

          <div style={addRow}>
            <input
              style={input}
              placeholder="Add new player"
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
            />

            <button style={addBtn} onClick={() => addPlayer(teamKey)}>
              Add
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const sectionCard = {
  background: "#f8fafc",
  borderRadius: 18,
  padding: 12,
  marginBottom: 14,
  border: "1px solid #e5e7eb",
};

const sectionTitleRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};

const sectionTitle = {
  margin: 0,
  fontSize: 17,
  fontWeight: 700,
};

const helperText = {
  fontSize: 12,
  color: "#6b7280",
};

const oversContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  marginBottom: 16,
};

const circleBtn = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  border: "none",
  background: "#4f46e5",
  color: "#fff",
  fontSize: 24,
  fontWeight: 700,
  cursor: "pointer",
};

const oversBox = {
  minWidth: 40,
  padding: "10px 14px",
  borderRadius: 16,
  background: "#eef2ff",
  textAlign: "center",
};

const oversValue = {
  fontSize: 18,
  fontWeight: 800,
  color: "#312e81",
  lineHeight: 1,
};

const oversLabel = {
  fontSize: 10,
  color: "#6b7280",
  marginTop: 4,
};

const primaryBtn = {
  display: "block",

  width: "85%",

  margin: "0 auto",

  padding: "8px 12px",

  borderRadius: 12,

  border: "none",

  background:
    "linear-gradient(135deg, #4f46e5, #4338ca)",

  color: "#fff",

  fontWeight: 500,

  fontSize: 14,

  cursor: "pointer",
};

const settingsRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "6px 0",
};

const settingTitle = {
  fontWeight: 600,
  fontSize: 14,
};

const settingDesc = {
  fontSize: 12,
  color: "#6b7280",
  marginTop: 2,
};

const divider = {
  height: 1,
  background: "#e5e7eb",
  margin: "10px 0",
};

const teamHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
};

const teamTitle = {
  fontSize: 16,
  fontWeight: 700,
};

const teamSubText = {
  fontSize: 12,
  color: "#6b7280",
  marginTop: 2,
};

const arrow = {
  fontSize: 14,
  color: "#6b7280",
};

const playerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid #e5e7eb",
};

const lockedText = {
  fontSize: 11,
  color: "#ef4444",
  marginTop: 2,
};

const lockBadge = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
};

const removeBtn = {
  border: "none",
  background: "#fee2e2",
  color: "#b91c1c",
  padding: "7px 12px",
  borderRadius: 10,
  fontWeight: 600,
  cursor: "pointer",
};

const addRow = {
  display: "flex",
  gap: 10,
  marginTop: 14,
};

const input = {
  flex: 1,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 14,
  background: "#fff",
};

const addBtn = {
  border: "none",
  background: "#4f46e5",
  color: "#fff",
  borderRadius: 12,
  padding: "0 18px",
  fontWeight: 700,
  cursor: "pointer",
};
