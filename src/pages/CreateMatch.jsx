import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { saveMatch } from "../storage/matchDB";

export default function CreateMatch() {
  const navigate = useNavigate();
  const { seasonId } = useParams();

  /* ---------------- backend teams ---------------- */
  const [teams, setTeams] = useState([]);
  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch(`${API}/api/teams?seasonId=${seasonId}`);
        const json = await res.json();

        setTeams(json.data || []);
      } catch (err) {
        console.error("Failed to load teams", err);
      }
    };

    loadTeams();
  }, []);

  /* ---------------- Team A ---------------- */
  const [teamAId, setTeamAId] = useState("");
  const [teamAName, setTeamAName] = useState("");

  /* ---------------- Team B ---------------- */
  const [teamBId, setTeamBId] = useState("");
  const [teamBName, setTeamBName] = useState("");

  /* ---------------- Match settings ---------------- */
  const [matchType, setMatchType] = useState("OVERS");
  const [overs, setOvers] = useState(6);

  const canCreate =
    (teamAId || teamAName.trim()) &&
    (teamBId || teamBName.trim()) &&
    (matchType !== "OVERS" || overs > 0);

  const resolveTeamSnapshot = (teamId, teamName) => {
    if (teamId) {
      const team = teams.find((t) => t._id === teamId);

      return {
        name: team.name,
        players: team.players || [], // copy players for offline
      };
    }

    return {
      name: teamName,
      players: [], // new team starts empty
    };
  };

  const handleCreate = async () => {
    if (!canCreate) return;

    const matchId = `match_${Date.now()}`;

    const teamASnapshot = resolveTeamSnapshot(teamAId, teamAName);
    const teamBSnapshot = resolveTeamSnapshot(teamBId, teamBName);

    const match = {
      id: matchId,
      seasonId,
      status: "setup",

      matchType,
      totalOvers: matchType === "OVERS" ? Number(overs) : null,

      teams: {
        teamA: teamASnapshot,
        teamB: teamBSnapshot,
      },

      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveMatch(match);

    navigate(`/season/${seasonId}/match/${matchId}/setup/team-a`,{ replace: true });
  };

  return (
    <div>
      {/* Header */}
      <div style={header}>
        <button onClick={() => navigate(-1)} style={backBtn}>
          ←
        </button>
        <h2>Create Match</h2>
        <div style={{ width: 24 }} />
      </div>

      {/* ---------------- TEAM A ---------------- */}
      <div style={section}>
        <label style={label}>Team A</label>

        <select
          value={teamAId}
          onChange={(e) => {
            setTeamAId(e.target.value);
            setTeamAName("");
          }}
          style={input}
        >
          <option value="">Select existing team</option>
          {teams.map((team) => (
            <option key={team._id} value={team._id}>
              {team.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Or create new team"
          value={teamAName}
          onChange={(e) => {
            setTeamAName(e.target.value);
            setTeamAId("");
          }}
          disabled={!!teamAId}
          style={input}
        />
      </div>

      {/* ---------------- TEAM B ---------------- */}
      <div style={section}>
        <label style={label}>Team B</label>

        <select
          value={teamBId}
          onChange={(e) => {
            setTeamBId(e.target.value);
            setTeamBName("");
          }}
          style={input}
        >
          <option value="">Select existing team</option>
          {teams.map((team) => (
            <option key={team._id} value={team._id}>
              {team.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Or create new team"
          value={teamBName}
          onChange={(e) => {
            setTeamBName(e.target.value);
            setTeamBId("");
          }}
          disabled={!!teamBId}
          style={input}
        />
      </div>

      {/* ---------------- MATCH TYPE ---------------- */}
      <div style={section}>
        <label style={label}>Match Type</label>

        <div style={row}>
          <button
            style={pill(matchType === "OVERS")}
            onClick={() => setMatchType("OVERS")}
          >
            Limited Overs
          </button>

          <button
            style={pill(matchType === "TEST")}
            onClick={() => setMatchType("TEST")}
          >
            Test
          </button>
        </div>

        {matchType === "OVERS" && (
          <input
            type="number"
            value={overs}
            onChange={(e) => setOvers(e.target.value)}
            style={input}
            placeholder="Number of overs"
          />
        )}
      </div>

      {/* ---------------- CREATE ---------------- */}
      <button
        disabled={!canCreate}
        onClick={handleCreate}
        style={{ ...primaryBtn, opacity: canCreate ? 1 : 0.5 }}
      >
        Create Match
      </button>
    </div>
  );
}

/* ---------------- styles ---------------- */

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  background: "#eef2ff",
  borderRadius: 12,
  marginBottom: 24,
};

const backBtn = {
  background: "none",
  border: "none",
  fontSize: 18,
  cursor: "pointer",
};

const section = { marginBottom: 24 };
const label = { fontWeight: 600, marginBottom: 6, display: "block" };

const input = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  marginBottom: 10,
};

const row = { display: "flex", gap: 8, marginBottom: 12 };

const pill = (active) => ({
  padding: "8px 14px",
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  background: active ? "#4f46e5" : "#eef2ff",
  color: active ? "#fff" : "#1e1b4b",
});

const primaryBtn = {
  width: "100%",
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: "#4f46e5",
  color: "#fff",
  fontWeight: 600,
};
