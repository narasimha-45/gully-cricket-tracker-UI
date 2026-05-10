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

    navigate(`/season/${seasonId}/match/${matchId}/setup/team-a`, {
      replace: true,
    });
  };

  return (
    <div style={container}>
      {/* Header */}
      <div style={heroBox}>
        <div style={heroTop}>
          <button onClick={() => navigate(-1)} style={backBtn}>
            ←
          </button>
          <div style={{ width: 28 }} />
          <div>
            <div style={heroTitle}>Create Match</div>

            {/* <div style={heroSub}>Setup teams and match format</div> */}
          </div>
        </div>
      </div>

      {/* ---------------- TEAM A ---------------- */}
      <div style={section}>
        <label style={label}>Team A</label>

        <div style={selectWrap}>
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
          <span style={selectArrow}></span>
        </div>
        <div style={{ height: 8 }} />
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

        <div style={selectWrap}>
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

          <span style={selectArrow}></span>
        </div>
        <div style={{ height: 8 }} />
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
        style={{
          ...primaryBtn,
          opacity: canCreate ? 1 : 0.5,
          background: canCreate ? "#4f46e5" : "#c7d2fe",
        }}
      >
        Create Match
      </button>
    </div>
  );
}

/* ---------------- styles ---------------- */
const container = {
  padding: 16,
  maxWidth: 520,
  margin: "0 auto",
};

const section = {
  marginBottom: 26,
};

const label = {
  fontWeight: 600,
  marginBottom: 10,
  display: "block",
  fontSize: 14,
};

const input = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#0d15f019",
  fontSize: 15,
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  boxSizing: "border-box",
};

const selectWrap = {
  position: "relative",
};

const selectArrow = {
  position: "absolute",
  right: 16,
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
  color: "#6b7280",
};

const row = { display: "flex", gap: 8, marginBottom: 12 };

const pill = (active) => ({
  flex: 1,
  height: 46,
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  transition: "0.2s ease",
  background: active ? "#4f46e5" : "#f3f4f6",
  color: active ? "#fff" : "#111827",
});

const primaryBtn = {
  width: "100%",
  padding: 16,
  borderRadius: 14,
  border: "none",
  background: "#4f46e5",
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  marginTop: 10,
  cursor: "pointer",
};

const topTitle = {
  fontSize: 20,
  fontWeight: 700,
};

const topBar = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 26,
};

const iconBtn = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontSize: 18,
  cursor: "pointer",
  flexShrink: 0,
};

const navBar = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 22,
};

const navTitle = {
  fontSize: 18,
  fontWeight: 700,
  color: "#111827",
};

const topSub = {
  fontSize: 13,
  color: "#6b7280",
  marginTop: 2,
};

const header = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  padding: "20px 24px",
  borderRadius: 24,
  background: "#f5f3ff",
  marginBottom: 28,
};

const title = {
  fontSize: 24,
  fontWeight: 800,
  color: "#111827",
  padding: "20px",
};

const heroBox = {
  background: "#031cfc31",
  borderRadius: 18,
  padding: "10px 20px",
  marginBottom: 28,
};

const heroTop = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const heroTitle = {
  fontSize: 25,
  fontWeight: 700,
  color: "#1e1b4b",
};

const heroSub = {
  marginTop: 4,
  fontSize: 14,
  color: "#6b7280",
};

const backBtn = {
  width: 35,
  height: 35,
  borderRadius: 14,
  border: "none",
  background: "#ffffff",
  fontSize: 18,
  cursor: "pointer",
  flexShrink: 0,
};
