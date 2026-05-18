import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMatch, saveMatch } from "../storage/matchDB";
import { formatName } from "../utils/helpers";

export default function TeamBPlayers() {
  const { seasonId, matchId } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const containerRef = useRef(null);
  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const loadMatch = async () => {
      try {
        const m = await getMatch(matchId);
        if (m) {
          const teamB = m.teams.teamB;
          const hasIds = teamB.players.some(p => /^[0-9a-fA-F]{24}$/.test(p));
          const needsSync = hasIds || (teamB.isExisting && teamB.players.length === 0);
          
          if (needsSync) {
            try {
              const res = await fetch(`${API}/api/teams/${encodeURIComponent(teamB.name)}`);
              const json = await res.json();
              if (json.success) {
                const profile = json.data.team || json.data.profile;
                const names = (profile.players || []).map(p => typeof p === 'object' ? p.name : p);
                
                // Update match with real names
                m.teams.teamB.players = names;
                await saveMatch(m);
              }
            } catch (e) { console.error("Sync failed", e); }
          }
          setMatch(m);
        }
      } catch (err) {
        console.error("Failed to load match", err);
      } finally {
        setLoading(false);
      }
    };
    loadMatch();
  }, [matchId]);

  // Search Logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const fetchPlayers = async () => {
      try {
        setSearchLoading(true);
        const res = await fetch(`${API}/api/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.success) setResults(json.data.players || []);
      } catch (err) {
        console.error("Player search failed", err);
      } finally {
        setSearchLoading(false);
      }
    };
    const timer = setTimeout(fetchPlayers, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close search
  useEffect(() => {
    const clickOut = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  if (loading) return <div style={container}><p>Loading squad...</p></div>;
  if (!match) return <div style={container}><p>Match not found</p></div>;

  const team = match.teams.teamB;
  const players = team.players || [];

  const addPlayer = async (name) => {
    if (!name.trim()) return;
    if (players.includes(name.trim())) {
      setQuery("");
      setIsOpen(false);
      return;
    }

    const updated = {
      ...match,
      teams: {
        ...match.teams,
        teamB: { ...team, players: [...players, name.trim()] },
      },
      updatedAt: Date.now(),
    };

    await saveMatch(updated);
    setMatch(updated);
    setQuery("");
    setIsOpen(false);
  };

  const removePlayer = async (index) => {
    const updated = {
      ...match,
      teams: {
        ...match.teams,
        teamB: { ...team, players: players.filter((_, i) => i !== index) },
      },
      updatedAt: Date.now(),
    };
    await saveMatch(updated);
    setMatch(updated);
  };

  return (
    <div style={container}>
      {/* HEADER */}
      <div style={header}>
        <button onClick={() => navigate(-1)} style={backCircle}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={title}>Squad Selection</h1>
          <p style={subtitle}>{formatName(team.name)}</p>
        </div>
      </div>

      {/* SEARCH BOX */}
      <div style={searchCard} ref={containerRef}>
        <label style={inputLabel}>Find or Add Player</label>
        <div style={inputWrapper}>
          <input 
            style={searchInput}
            placeholder="Search by name..."
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
          />
          {searchLoading && <div style={miniSpinner}></div>}
        </div>

        {isOpen && query.trim() && (
          <div style={dropdown}>
            {results.length > 0 ? (
              results.map((p, idx) => (
                <div key={idx} style={dropItem} onClick={() => addPlayer(p.name)}>
                  <div style={playerIcon}>👤</div>
                  <div>
                    <div style={playerNameStyle}>{formatName(p.name)}</div>
                    <div style={playerMeta}>{p.team || "Player"}</div>
                  </div>
                </div>
              ))
            ) : !searchLoading ? (
              <div style={dropItem} onClick={() => addPlayer(query)}>
                <div style={newPlayerIcon}>+</div>
                <div>
                  <div style={playerNameStyle}>New Player: "{formatName(query)}"</div>
                  <div style={playerMeta}>Will be added to this squad</div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* SQUAD LIST */}
      <div style={sectionTitle}>
        Current Squad <span>({players.length})</span>
      </div>

      <div style={playerList}>
        {players.length === 0 ? (
          <div style={emptySquad}>No players added yet</div>
        ) : (
          players.map((p, i) => (
            <div key={i} style={playerRow}>
              <div style={playerAvatar}>{p[0]?.toUpperCase()}</div>
              <div style={playerInfo}>
                <div style={playerNameInList}>{formatName(p)}</div>
              </div>
              <button onClick={() => removePlayer(i)} style={removeBtn}>✕</button>
            </div>
          ))
        )}
      </div>

      {/* FOOTER */}
      <div style={footer}>
        <button 
          onClick={() => navigate(`/season/${seasonId}/match/${matchId}/toss`, { replace: true })}
          disabled={players.length === 0}
          style={players.length === 0 ? disabledBtn : primaryBtn}
        >
          Next: Toss Selection →
        </button>
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const container = { padding: "20px", maxWidth: 500, margin: "0 auto", paddingBottom: 100 };
const header = { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 };
const backCircle = { width: 36, height: 36, borderRadius: "50%", border: "1px solid #e2e8f0", background: "white", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const title = { fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 };
const subtitle = { 
  fontSize: 16, 
  color: "#4f46e5", 
  fontWeight: 800, 
  margin: "6px 0 0",
  background: "#f5f3ff",
  padding: "4px 12px",
  borderRadius: 8,
  display: "inline-block",
  textTransform: "uppercase",
  letterSpacing: "0.05em"
};

const searchCard = { background: "white", borderRadius: 20, padding: "20px", border: "1px solid #eef2ff", boxShadow: "0 4px 15px rgba(0,0,0,0.02)", marginBottom: 24, position: "relative" };
const inputLabel = { fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "block" };
const inputWrapper = { position: "relative" };
const searchInput = { width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #f1f5f9", fontSize: 15, fontWeight: 500, outline: "none", background: "#f8fafc", boxSizing: "border-box" };

const dropdown = { position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "white", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 200, overflowY: "auto" };
const dropItem = { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f8fafc" };
const playerIcon = { width: 32, height: 32, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 };
const newPlayerIcon = { width: 32, height: 32, borderRadius: 8, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 };
const playerNameStyle = { fontSize: 14, fontWeight: 700, color: "#0f172a" };
const playerMeta = { fontSize: 11, color: "#94a3b8" };

const sectionTitle = { fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 12, display: "flex", justifyContent: "space-between", paddingLeft: 4 };

const playerList = { display: "flex", flexDirection: "column", gap: 10 };
const playerRow = { display: "flex", alignItems: "center", gap: 12, padding: "12px", background: "white", borderRadius: 16, border: "1px solid #f1f5f9" };
const playerAvatar = { width: 36, height: 36, borderRadius: "50%", background: "#f5f3ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 };
const playerInfo = { flex: 1 };
const playerNameInList = { fontSize: 15, fontWeight: 600, color: "#1e293b" };
const removeBtn = { width: 32, height: 32, borderRadius: 8, border: "none", background: "#fef2f2", color: "#ef4444", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const emptySquad = { textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontSize: 14, fontStyle: "italic" };

const footer = { position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 40px)", maxWidth: 400 };
const primaryBtn = { width: "100%", padding: "16px", borderRadius: 14, border: "none", background: "#4f46e5", color: "white", fontSize: 15, fontWeight: 700, boxShadow: "0 8px 20px rgba(79, 70, 229, 0.2)", cursor: "pointer" };
const disabledBtn = { width: "100%", padding: "16px", borderRadius: 14, border: "none", background: "#e2e8f0", color: "#94a3b8", fontSize: 15, fontWeight: 700, cursor: "not-allowed" };

const miniSpinner = { position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, border: "2px solid #e2e8f0", borderTop: "2px solid #4f46e5", borderRadius: "50%", animation: "spin 0.6s linear infinite" };
