import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { saveMatch } from "../storage/matchDB";

export default function CreateMatch() {
  const navigate = useNavigate();
  const { seasonId } = useParams();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_BASE_URL;

  // Team Selection State
  const [teamA, setTeamA] = useState({ id: "", name: "", query: "", players: [] });
  const [teamB, setTeamB] = useState({ id: "", name: "", query: "", players: [] });
  
  // Format State
  const [matchType, setMatchType] = useState("OVERS");
  const [overs, setOvers] = useState(6);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/teams/season/${seasonId}`);
        const json = await res.json();
        setTeams(json.data || []);
      } catch (err) {
        console.error("Failed to load teams", err);
      } finally {
        setLoading(false);
      }
    };
    loadTeams();
  }, [seasonId]);

  const canCreate = teamA.query.trim() && teamB.query.trim() && (matchType !== "OVERS" || overs > 0);

  const handleCreate = async () => {
    if (!canCreate) return;

    const matchId = `match_${Date.now()}`;
    
    const resolveTeam = (t) => {
      return { 
        name: t.name || t.query, 
        players: t.players || [],
        isExisting: !!t.id
      };
    };

    const match = {
      id: matchId,
      seasonId,
      status: "setup",
      matchType,
      totalOvers: matchType === "OVERS" ? Number(overs) : null,
      teams: {
        teamA: resolveTeam(teamA),
        teamB: resolveTeam(teamB),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveMatch(match);
    navigate(`/season/${seasonId}/match/${matchId}/team-a`, { replace: true });
  };

  return (
    <div style={container}>
      {/* HEADER */}
      <div style={header}>
        <button onClick={() => navigate(-1)} style={backCircle}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={title}>New Match</h1>
          <p style={subtitle}>Configure teams and format</p>
        </div>
        <div style={badge}>Season Mode</div>
      </div>

      <div style={mainGrid}>
        {/* TEAM SELECTION */}
        <div style={sectionCard}>
          <div style={sectionTitle}>
            <span style={iconSpan}>🛡️</span>
            Select Teams
          </div>
          
          <div style={teamGrid}>
            <TeamSearch 
              label="Team A" 
              value={teamA} 
              setValue={setTeamA} 
              otherSelectedId={teamB.name}
            />
            <div style={vsDivider}>VS</div>
            <TeamSearch 
              label="Team B" 
              value={teamB} 
              setValue={setTeamB} 
              otherSelectedId={teamA.name}
            />
          </div>
        </div>

        {/* MATCH FORMAT */}
        <div style={sectionCard}>
          <div style={sectionTitle}>
            <span style={iconSpan}>⚙️</span>
            Match Format
          </div>
          
          <div style={formatRow}>
            <div style={{ flex: 1 }}>
              <label style={inputLabel}>Format Type</label>
              <div style={toggleGroup}>
                <button 
                  style={matchType === "OVERS" ? activeToggle : inactiveToggle}
                  onClick={() => setMatchType("OVERS")}
                >
                  Limited Overs
                </button>
                <button 
                  style={matchType === "TEST" ? activeToggle : inactiveToggle}
                  onClick={() => setMatchType("TEST")}
                >
                  Test Match
                </button>
              </div>
            </div>

            {matchType === "OVERS" && (
              <div style={{ width: 120 }}>
                <label style={inputLabel}>Overs</label>
                <input 
                  type="number" 
                  style={numInput} 
                  value={overs} 
                  onChange={e => setOvers(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER ACTION */}
      <div style={footer}>
        <button 
          onClick={handleCreate}
          disabled={!canCreate}
          style={!canCreate ? disabledBtn : primaryBtn}
        >
          {canCreate ? "Begin Match Setup" : "Please select teams"}
        </button>
      </div>
    </div>
  );
}

function TeamSearch({ label, value, setValue, otherSelectedId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (!value.query.trim()) {
      setResults([]);
      return;
    }

    const fetchTeams = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/search?q=${encodeURIComponent(value.query)}`);
        const json = await res.json();
        console.log(json);
        if (json.success) {
          // Filter out the team selected in the other slot

          const filtered = (json.data.teams || []).filter(t => t.name !== otherSelectedId);
          console.log(filtered);
          setResults(filtered);
        }
      } catch (err) {
        console.error("Team search failed", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchTeams, 300);
    return () => clearTimeout(timer);
  }, [value.query, otherSelectedId]);

  useEffect(() => {
    const clickOut = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  return (
    <div style={{ position: "relative", flex: 1 }} ref={containerRef}>
      <label style={inputLabel}>{label}</label>
      <div style={inputWrapper}>
        <input 
          style={searchInput}
          placeholder="Search team name..."
          value={value.query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setValue({ id: "", name: "", query: e.target.value, players: [] });
            setIsOpen(true);
          }}
        />
        {value.name && !loading && <span style={checkIcon}>✓</span>}
        {loading && <div style={miniSpinner}></div>}
      </div>

      {isOpen && (value.query.trim()) && (
        <div style={dropdown}>
          {results.length > 0 ? (
            results.map(t => (
              <div 
                key={t.id} 
                style={dropItem}
                onClick={async () => {
                  // Set what we have immediately from the search result
                  setValue({ 
                    id: t.id, 
                    name: t.name, 
                    query: t.name, 
                    players: t.players || [] 
                  });
                  
                  setLoading(true);
                  try {
                    const res = await fetch(`${API}/api/teams/${encodeURIComponent(t.name)}`);
                    const json = await res.json();
                    console.log(json);
                    if (json.success && (json.data?.team || json.data?.profile)) {
                      const profile = json.data.team || json.data.profile;
                      setValue({ 
                        id: profile._id, 
                        name: profile.name, 
                        query: profile.name,
                        players: (profile.players || []).map(p => {
                          if (typeof p === 'object' && p !== null) return p.name || "Unknown Player";
                          return p;
                        })
                      });
                    }
                  } catch (err) {
                    console.error("Failed to fetch team details", err);
                  } finally {
                    setLoading(false);
                    setIsOpen(false);
                  }
                }}
              >
                <div style={teamIcon}>🛡️</div>
                <div>
                  <div style={teamNameStyle}>{t.name}</div>
                  <div style={teamMeta}>{t.matches} matches played</div>
                </div>
              </div>
            ))
          ) : !loading ? (
            <div 
              style={dropItem}
              onClick={() => setIsOpen(false)}
            >
              <div style={newTeamIcon}>+</div>
              <div>
                <div style={teamNameStyle}>New Team: "{value.query}"</div>
                <div style={teamMeta}>Will be created for this match</div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

const miniSpinner = {
  position: "absolute",
  right: 16,
  top: "50%",
  transform: "translateY(-50%)",
  width: 16,
  height: 16,
  border: "2px solid #e2e8f0",
  borderTop: "2px solid #4f46e5",
  borderRadius: "50%",
  animation: "spin 0.6s linear infinite"
};

/* ---------------- STYLES ---------------- */
const container = { padding: "20px", maxWidth: 600, margin: "0 auto", paddingBottom: 100 };

const header = { display: "flex", alignItems: "center", gap: 16, marginBottom: 32 };
const backCircle = { width: 40, height: 40, borderRadius: "50%", border: "1px solid #e2e8f0", background: "white", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const title = { fontSize: 28, fontWeight: 800, color: "#0f172a", margin: 0 };
const subtitle = { fontSize: 14, color: "#64748b", margin: "4px 0 0" };
const badge = { background: "#eff6ff", color: "#3b82f6", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700 };

const mainGrid = { display: "flex", flexDirection: "column", gap: 20 };
const sectionCard = { background: "white", borderRadius: 20, padding: 24, border: "1px solid #eef2ff", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" };
const sectionTitle = { fontSize: 16, fontWeight: 700, color: "#334155", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 };
const iconSpan = { fontSize: 20 };

const teamGrid = { display: "flex", flexDirection: "column", gap: 16, position: "relative" };
const vsDivider = { textAlign: "center", fontSize: 11, fontWeight: 800, color: "#cbd5e1", padding: "4px 0", letterSpacing: "0.2em" };

const inputLabel = { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "block" };
const inputWrapper = { position: "relative" };
const searchInput = { width: "100%", padding: "14px 16px", borderRadius: 14, border: "2px solid #f1f5f9", fontSize: 15, fontWeight: 500, outline: "none", transition: "all 0.2s", background: "#f8fafc" };
const checkIcon = { position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "#10b981", fontWeight: 900 };

const dropdown = { position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "white", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 220, overflowY: "auto" };
const dropItem = { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f8fafc" };
const teamIcon = { width: 36, height: 36, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 };
const newTeamIcon = { width: 36, height: 36, borderRadius: 10, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700 };
const teamNameStyle = { fontSize: 14, fontWeight: 700, color: "#0f172a" };
const teamMeta = { fontSize: 11, color: "#94a3b8" };

const formatRow = { display: "flex", gap: 20, alignItems: "flex-end" };
const toggleGroup = { display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 12, gap: 4 };
const activeToggle = { flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", background: "white", color: "#4f46e5", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 4px rgba(0,0,0,0.05)", cursor: "pointer" };
const inactiveToggle = { flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", background: "transparent", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const numInput = { width: "100%", padding: "12px", borderRadius: 12, border: "2px solid #f1f5f9", fontSize: 15, fontWeight: 700, textAlign: "center", background: "white" };

const footer = { position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 40px)", maxWidth: 400 };
const primaryBtn = { width: "100%", padding: "18px", borderRadius: 16, border: "none", background: "#4f46e5", color: "white", fontSize: 16, fontWeight: 700, boxShadow: "0 8px 20px rgba(79, 70, 229, 0.3)", cursor: "pointer" };
const disabledBtn = { width: "100%", padding: "18px", borderRadius: 16, border: "none", background: "#e2e8f0", color: "#94a3b8", fontSize: 16, fontWeight: 700, cursor: "not-allowed" };
