import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";

/**
 * REUSABLE PLAYER SEARCH INPUT WITH AUTO-SUGGESTIONS
 */
const PlayerSearchInput = ({ label, placeholder, value, onChange, apiBase }) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (q) => {
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/stats/search/players?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json.success) {
        setSuggestions(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch suggestions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isOpen) fetchSuggestions(query);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [query, isOpen]);

  const handleSelect = (name) => {
    setQuery(name);
    onChange(name);
    setIsOpen(false);
  };

  return (
    <div style={field} ref={wrapperRef}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input 
          style={input} 
          placeholder={placeholder} 
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (!e.target.value) onChange("");
          }}
          onFocus={() => setIsOpen(true)}
        />
        {isOpen && (query.length >= 2) && (
          <div style={suggestionDropdown}>
            {loading ? (
              <div style={suggestionItem}>Searching...</div>
            ) : suggestions.length > 0 ? (
              suggestions.map((p) => (
                <div 
                  key={p._id} 
                  style={suggestionItem}
                  onClick={() => handleSelect(p.name)}
                >
                  <span style={{ textTransform: "capitalize" }}>{p.name}</span>
                </div>
              ))
            ) : (
              <div style={suggestionItem}>No players found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Matchups() {
  const { globalFilter } = useOutletContext();
  const [mode, setMode] = useState("rivalry"); // "rivalry" or "comparison"
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API = import.meta.env.VITE_API_BASE_URL;

  const handleFetch = async () => {
    if (!p1 || !p2) return;
    try {
      setLoading(true);
      setError(null);
      
      const sId = globalFilter === "all" ? "overall" : globalFilter;

      if (mode === "rivalry") {
        const res = await fetch(`${API}/api/stats/rivalry?batter=${encodeURIComponent(p1)}&bowler=${encodeURIComponent(p2)}&seasonId=${sId}`);
        const json = await res.json();
        if (json.success) setData(json.data);
        else setError(json.message);
      } else {
        // Comparison Mode
        const res = await fetch(`${API}/api/stats/head-to-head/player?player1=${encodeURIComponent(p1)}&player2=${encodeURIComponent(p2)}&seasonId=${sId}`);
        const json = await res.json();
        
        if (json.success) {
          setData({ 
            p1: json.data.players[0], 
            p2: json.data.players[1] 
          });
        } else {
          setError(json.message || "Could not compare players.");
        }
      }
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Reset data when switching modes or filters
  useEffect(() => {
    setData(null);
    setError(null);
  }, [mode, globalFilter]);

  return (
    <div style={container}>
      {/* MODE TABS */}
      <div style={modeTabs}>
        <button 
          style={mode === "rivalry" ? activeModeTab : modeTab} 
          onClick={() => setMode("rivalry")}
        >
          Batter vs Bowler
        </button>
        <button 
          style={mode === "comparison" ? activeModeTab : modeTab} 
          onClick={() => setMode("comparison")}
        >
          Player Comparison
        </button>
      </div>

      <div style={card}>
        <div style={headerIcon}>{mode === "rivalry" ? "⚔️" : "⚖️"}</div>
        <h2 style={title}>{mode === "rivalry" ? "Rivalry Face-Off" : "Head-to-Head Comparison"}</h2>
        <p style={sub}>
          {mode === "rivalry" 
            ? "Who dominates the head-to-head battle?" 
            : "Compare career statistics side-by-side."}
        </p>

        <div style={inputRow}>
          <PlayerSearchInput 
            label={mode === "rivalry" ? "Batter" : "Player A"} 
            placeholder="Search..." 
            value={p1}
            onChange={setP1}
            apiBase={API}
          />
          <div style={vs}>VS</div>
          <PlayerSearchInput 
            label={mode === "rivalry" ? "Bowler" : "Player B"} 
            placeholder="Search..." 
            value={p2}
            onChange={setP2}
            apiBase={API}
          />
        </div>

        <button 
          style={{
            ...btn,
            opacity: (!p1 || !p2) ? 0.6 : 1,
          }} 
          onClick={handleFetch}
          disabled={!p1 || !p2 || loading}
        >
          {loading ? "Analyzing..." : mode === "rivalry" ? "Check Matchup" : "Compare Players"}
        </button>

        {error && <div style={errorBox}>{error}</div>}
      </div>

      {data && mode === "rivalry" && (
        <div style={resultCard}>
          <div style={resultHeader}>Matchup Summary</div>
          <div style={statsGrid}>
            <div style={statBox}>
              <div style={statVal}>{data.totalDismissals}</div>
              <div style={statLabel}>Total Wickets</div>
              <div style={statDesc}>by <span style={{ textTransform: "capitalize" }}>{data.bowler}</span></div>
            </div>
            <div style={statBox}>
              <div style={statVal}>
                {data.totalDismissals >= 5 ? "Elite" : data.totalDismissals > 0 ? "Strong" : "Clean"}
              </div>
              <div style={statLabel}>Bowler Grip</div>
              <div style={statDesc}>dominance level</div>
            </div>
          </div>

          {/* DISMISSAL BREAKDOWN */}
          {data.breakdown && Object.values(data.breakdown).some(v => v > 0) && (
            <div style={breakdownBox}>
              <div style={breakdownTitle}>Dismissal Breakdown</div>
              <div style={breakdownGrid}>
                {Object.entries(data.breakdown).map(([type, count]) => count > 0 && (
                  <div key={type} style={breakdownItem}>
                    <span style={breakdownType}>{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span style={breakdownCount}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={futureNote}>
            💡 Detailed ball-by-ball analysis coming soon!
          </div>
        </div>
      )}

      {data && mode === "comparison" && (
        <div style={comparisonCard}>
          <div style={comparisonGrid}>
            <div style={playerHeaderCol}>
              <div style={avatarCircle}>{(p1 || "A")[0].toUpperCase()}</div>
              <div style={playerNameLabel}>{p1}</div>
            </div>
            <div style={vsDivider}>VS</div>
            <div style={playerHeaderCol}>
              <div style={avatarCircle}>{(p2 || "B")[0].toUpperCase()}</div>
              <div style={playerNameLabel}>{p2}</div>
            </div>
          </div>

          <div style={statsTable}>
            <StatRow label="Innings" v1={data.p1.stats.batting.innings} v2={data.p2.stats.batting.innings} />
            <StatRow label="Total Runs" v1={data.p1.stats.batting.runs} v2={data.p2.stats.batting.runs} isHighBetter />
            <StatRow label="Average" v1={data.p1.derived.battingAverage} v2={data.p2.derived.battingAverage} isHighBetter />
            <StatRow label="Strike Rate" v1={data.p1.derived.strikeRate} v2={data.p2.derived.strikeRate} isHighBetter />
            <div style={tableDivider} />
            <StatRow label="Wickets" v1={data.p1.stats.bowling.wickets} v2={data.p2.stats.bowling.wickets} isHighBetter />
            <StatRow label="Economy" v1={data.p1.derived.economy} v2={data.p2.derived.economy} isHighBetter={false} />
            <StatRow label="MoM" v1={data.p1.stats.achievements.mom} v2={data.p2.stats.achievements.mom} isHighBetter />
          </div>
        </div>
      )}
    </div>
  );
}

const StatRow = ({ label, v1, v2, isHighBetter = true }) => {
  const n1 = Number(v1) || 0;
  const n2 = Number(v2) || 0;
  const isBetter1 = isHighBetter ? n1 > n2 : n1 < n2 && n1 > 0;
  const isBetter2 = isHighBetter ? n2 > n1 : n2 < n1 && n2 > 0;

  return (
    <div style={rowStyle}>
      <div style={{ ...valStyle, color: isBetter1 ? "#4f46e5" : "#64748b", fontWeight: isBetter1 ? 800 : 500 }}>{v1}</div>
      <div style={rowLabel}>{label}</div>
      <div style={{ ...valStyle, color: isBetter2 ? "#4f46e5" : "#64748b", fontWeight: isBetter2 ? 800 : 500 }}>{v2}</div>
    </div>
  );
};

/* ── STYLES ── */
const container = { display: "flex", flexDirection: "column", gap: 20, paddingBottom: 60 };

const modeTabs = {
  display: "flex",
  background: "#f1f5f9",
  padding: 4,
  borderRadius: 14,
  gap: 4
};

const modeTab = {
  flex: 1,
  padding: "10px",
  border: "none",
  background: "transparent",
  fontSize: 13,
  fontWeight: 600,
  color: "#64748b",
  cursor: "pointer",
  borderRadius: 10,
  transition: "all 0.2s"
};

const activeModeTab = {
  ...modeTab,
  background: "white",
  color: "#4f46e5",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
};

const card = {
  background: "white",
  padding: "24px",
  borderRadius: 24,
  border: "1px solid #f1f5f9",
  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
  textAlign: "center",
};

const headerIcon = { fontSize: 32, marginBottom: 12 };
const title = { margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#0f172a" };
const sub = { margin: "0 0 24px", color: "#64748b", fontSize: 14 };

const inputRow = {
  display: "flex",
  alignItems: "flex-end",
  gap: 8,
  marginBottom: 20,
};

const field = { textAlign: "left", flex: 1 };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, paddingLeft: 4 };
const input = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", background: "#f8fafc", boxSizing: "border-box" };
const vs = { fontWeight: 900, color: "#cbd5e1", fontSize: 11, paddingBottom: 14 };

const btn = { width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #4f46e5, #3730a3)", color: "white", fontWeight: 700, cursor: "pointer" };
const errorBox = { marginTop: 16, padding: 12, background: "#fff1f2", color: "#be123c", borderRadius: 12, fontSize: 13 };

const resultCard = { background: "white", padding: 24, borderRadius: 24, border: "1px solid #f1f5f9" };
const resultHeader = { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 16, textAlign: "center" };
const statsGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const statBox = { padding: 20, background: "#f8fafc", borderRadius: 16, textAlign: "center" };
const statVal = { fontSize: 32, fontWeight: 900, color: "#0f172a" };
const statLabel = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginTop: 4 };
const statDesc = { fontSize: 11, color: "#94a3b8", marginTop: 2 };
const futureNote = { marginTop: 16, padding: 12, background: "#eff6ff", color: "#1e40af", borderRadius: 12, fontSize: 12 };

const breakdownBox = { marginTop: 20, padding: 16, background: "#f8fafc", borderRadius: 16, border: "1px solid #f1f5f9" };
const breakdownTitle = { fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 12, textAlign: "center", letterSpacing: "0.05em" };
const breakdownGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" };
const breakdownItem = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" };
const breakdownType = { fontSize: 13, color: "#64748b", textTransform: "capitalize" };
const breakdownCount = { fontSize: 13, fontWeight: 700, color: "#1e293b" };

const comparisonCard = { background: "white", padding: 24, borderRadius: 24, border: "1px solid #f1f5f9" };
const comparisonGrid = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 };
const playerHeaderCol = { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 };
const avatarCircle = { width: 44, height: 44, background: "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#4f46e5" };
const playerNameLabel = { fontSize: 14, fontWeight: 700, color: "#1e293b", textTransform: "capitalize" };
const vsDivider = { fontSize: 12, fontWeight: 900, color: "#e2e8f0" };

const statsTable = { display: "flex", flexDirection: "column", gap: 12 };
const rowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" };
const valStyle = { flex: 1, textAlign: "center", fontSize: 16 };
const rowLabel = { flex: 1, textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" };
const tableDivider = { height: 1, background: "#f1f5f9", margin: "4px 0" };

const suggestionDropdown = { position: "absolute", top: "110%", left: 0, right: 0, background: "white", borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 100, border: "1px solid #e2e8f0", maxHeight: 200, overflowY: "auto", boxSizing: "border-box" };
const suggestionItem = { padding: "10px 14px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #f1f5f9", color: "#334155" };
