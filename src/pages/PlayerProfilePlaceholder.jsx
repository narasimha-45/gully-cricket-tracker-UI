import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL;

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("overall");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    loadProfile();
    loadRecentMatches();
  }, [id, selectedSeason]);

  const fetchSeasons = async () => {
    try {
      const res = await fetch(`${API}/api/seasons`);
      const json = await res.json();
      if (json.success) setSeasons(json.data);
    } catch (err) {
      console.error("Failed to fetch seasons", err);
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      let url = `${API}/api/stats/player/${encodeURIComponent(id)}`;
      if (selectedSeason !== "overall") {
        url = `${API}/api/stats/player/${encodeURIComponent(id)}/season/${selectedSeason}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setProfile(json.data);
      else setProfile(null);
    } catch (err) {
      console.error("Failed to load player profile", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentMatches = async () => {
    try {
      const res = await fetch(`${API}/api/stats/player/${encodeURIComponent(id)}/matches?limit=3`);
      const json = await res.json();
      if (json.success) setRecentMatches(json.data);
    } catch (err) {
      console.error("Failed to fetch matches", err);
    }
  };

  if (loading && !profile) return (
    <div style={loadingContainer}>
      <div style={spinnerStyle}></div>
      <div style={{ marginTop: 16, color: "#64748b", fontWeight: 500 }}>Fetching player data...</div>
    </div>
  );

  if (!profile) return (
    <div style={errorContainer}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>👤</div>
      <h2 style={{ margin: "0 0 8px", color: "#0f172a" }}>Player not found</h2>
      <p style={{ margin: "0 0 24px", color: "#64748b", maxWidth: 280, lineHeight: 1.5 }}>
        We couldn't find a player with the ID "{id}".
      </p>
      <button onClick={() => navigate("/")} style={homeBtn}>Go to Home</button>
    </div>
  );

  const p = profile.profile || { name: id };
  const stats = profile.stats;
  const derived = profile.derived || {};

  const batting = (stats && stats.batting) || { highestScore: {}, dismissalTypes: {}, dismissedBy: {} };
  const bowling = (stats && stats.bowling) || { bestBowling: {}, wicketHauls: {}, dismissedBatters: {}, wicketTypes: {} };
  const fielding = (stats && stats.fielding) || { catches: 0, runOuts: 0, stumpings: 0 };
  const achievements = (stats && stats.achievements) || { mom: 0 };

  const initials = (p.name || id || "P").slice(0, 1).toUpperCase();

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 0, paddingBottom: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => navigate(-1)} style={backBtn}>← Back</button>
        
        <select 
          style={seasonSelect}
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
        >
          <option value="overall">All Seasons (Overall)</option>
          {seasons.map(s => (
            <option key={s._id} value={s._id}>{s.seasonName}</option>
          ))}
        </select>
      </div>

      {/* HEADER */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={avatar}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: "#0f172a", textTransform: "capitalize" }}>
              {p.name}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2, textTransform: "capitalize" }}>
              {(p.teamsPlayedFor || []).join(" · ")}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
              {selectedSeason === "overall" ? p.totalMatches : (stats?.totalMatches || 0)}
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>matches</div>
          </div>
        </div>

        <div style={divider} />

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Badge color="purple">🏅 {achievements.mom} MOM</Badge>
          <Badge color="teal">📅 {(p.seasonsPlayed || []).length} seasons</Badge>
        </div>
      </div>

      {/* NO STATS HINT */}
      {!stats && selectedSeason !== "overall" && (
        <div style={noStatsBanner}>
           ⚠️ No performance data found for this player in the selected season.
        </div>
      )}

      {/* BATTING */}
      <SectionTitle>Batting Analytics</SectionTitle>
      <div style={grid2}>
        <StatTile label="Runs" value={batting.runs || 0} />
        <StatTile label="Innings" value={batting.innings || 0} />
        <StatTile label="Average" value={derived.battingAverage || "0.00"} />
        <StatTile label="Strike rate" value={derived.strikeRate || "0.00"} />
      </div>
      
      <div style={{ ...card, marginTop: 12 }}>
        <Row label="Highest score" value={batting.highestScore?.runs || 0} />
        <Row label="4s / 6s" value={`${batting.fours || 0} / ${batting.sixes || 0}`} />
        <Row label="Not outs" value={batting.notOuts || 0} />
        <Row label="Ducks" value={batting.ducks || 0} last />
      </div>

      <CollapsibleSection title="Dismissal Breakdown" icon="📉">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(batting.dismissalTypes || {})
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => count > 0 && (
              <Row key={type} label={type.replace(/([A-Z])/g, ' $1')} value={count} />
            ))}
          {(!batting.dismissalTypes || Object.values(batting.dismissalTypes).every(v => v === 0)) && (
            <div style={emptyHint}>No dismissals recorded.</div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Dismissed By (Bowlers)" icon="🏹">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(batting.dismissedBy || {})
            .map(([bowler, info]) => [bowler, typeof info === 'object' ? info.total : info])
            .sort(([, a], [, b]) => b - a)
            .map(([bowler, count]) => (
              <Row 
                key={bowler} 
                label={bowler} 
                value={count} 
                onClick={() => navigate(`/player/${encodeURIComponent(bowler)}`)}
                isClickable
              />
            ))}
          {(!batting.dismissedBy || Object.keys(batting.dismissedBy).length === 0) && (
            <div style={emptyHint}>Never dismissed by a bowler yet.</div>
          )}
        </div>
      </CollapsibleSection>

      {/* BOWLING */}
      <SectionTitle>Bowling Analytics</SectionTitle>
      <div style={grid2}>
        <StatTile label="Wickets" value={bowling.wickets || 0} />
        <StatTile label="Innings" value={bowling.innings || 0} />
        <StatTile label="Average" value={derived.bowlingAverage || "0.00"} />
        <StatTile label="Economy" value={derived.economy || "0.00"} />
      </div>
      
      <div style={{ ...card, marginTop: 12 }}>
        <Row label="Best bowling" value={`${bowling.bestBowling?.wickets || 0} / ${bowling.bestBowling?.runs || 0}`} />
        <Row label="Maidens" value={bowling.maidens || 0} />
        <Row label="3-wicket hauls" value={bowling.wicketHauls?.w3 || 0} />
        <Row label="4-wicket hauls" value={bowling.wicketHauls?.w4 || 0} last />
      </div>

      <CollapsibleSection title="Wicket Types" icon="📉">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(bowling.wicketTypes || {})
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => count > 0 && (
              <Row key={type} label={type.replace(/([A-Z])/g, ' $1')} value={count} />
            ))}
          {(!bowling.wicketTypes || Object.values(bowling.wicketTypes).every(v => v === 0)) && (
            <div style={emptyHint}>No wickets recorded.</div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Dismissed Batters (Victims)" icon="🎯">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(bowling.dismissedBatters || {})
            .map(([batter, info]) => [batter, typeof info === 'object' ? info.total : info])
            .sort(([, a], [, b]) => b - a)
            .map(([batter, count]) => (
              <Row 
                key={batter} 
                label={batter} 
                value={count} 
                onClick={() => navigate(`/player/${encodeURIComponent(batter)}`)}
                isClickable
              />
            ))}
          {(!bowling.dismissedBatters || Object.keys(bowling.dismissedBatters).length === 0) && (
            <div style={emptyHint}>No wickets taken yet.</div>
          )}
        </div>
      </CollapsibleSection>

      {/* FIELDING */}
      <SectionTitle>Fielding Analytics</SectionTitle>
      <div style={grid2}>
        <StatTile label="Catches" value={fielding.catches || 0} />
        <StatTile label="Run outs" value={fielding.runOuts || 0} />
        <StatTile label="Stumpings" value={fielding.stumpings || 0} />
      </div>

      {/* RECENT PERFORMANCE AT THE BOTTOM */}
      {recentMatches.length > 0 && (
        <>
          <SectionTitle>Recent Form (Last 3 Matches)</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentMatches.map((m, idx) => (
              <div key={idx} style={matchBox}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={matchTeam}>{m.teamName} vs {m.opponentName}</span>
                  <span style={matchDate}>{new Date(m.matchDate).toLocaleDateString()}</span>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={matchStat}>🏏 {m.batting?.runs || 0}({m.batting?.balls || 0})</div>
                  <div style={matchStat}>🥎 {m.bowling?.wickets || 0} wkts</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ height: 32 }} />
    </div>
  );
}

const CollapsibleSection = ({ title, icon, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ marginTop: 12 }}>
      <button 
        style={{ ...collapsibleBtn, borderBottom: isOpen ? "none" : "1px solid #e2e8f0", borderRadius: isOpen ? "16px 16px 0 0" : "16px" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
        </span>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div style={{ background: "white", padding: "8px 16px 16px", borderRadius: "0 0 16px 16px", border: "1px solid #e2e8f0", borderTop: "none" }}>
          {children}
        </div>
      )}
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "28px 0 10px", paddingLeft: 4 }}>
    {children}
  </div>
);

const StatTile = ({ label, value }) => (
  <div style={{ background: "white", borderRadius: 16, padding: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
    <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{value}</div>
  </div>
);

const Row = ({ label, value, last, onClick, isClickable }) => (
  <div 
    style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center", 
      padding: "10px 0", 
      borderBottom: last ? "none" : "1px solid #f1f5f9",
      cursor: isClickable ? "pointer" : "default" 
    }}
    onClick={onClick}
  >
    <span style={{ fontSize: 13, color: isClickable ? "#4f46e5" : "#64748b", fontWeight: isClickable ? 600 : 400, textTransform: "capitalize" }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{value}</span>
  </div>
);

const Badge = ({ children, color }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, ...badgeColors[color] }}>
    {children}
  </span>
);

const badgeColors = {
  purple: { background: "#f5f3ff", color: "#5b21b6" },
  teal:   { background: "#f0fdfa", color: "#0f766e" },
  gray:   { background: "#f8fafc", color: "#475569" },
};

const card = { background: "white", borderRadius: 18, border: "1px solid #e2e8f0", padding: "18px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" };
const grid2 = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 };
const avatar = { width: 52, height: 52, borderRadius: "50%", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#5b21b6" };
const divider = { border: "none", borderTop: "1px solid #f1f5f9", margin: "16px 0" };
const seasonSelect = { padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 600, color: "#475569", background: "white", outline: "none" };
const collapsibleBtn = { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "white", border: "1px solid #e2e8f0", cursor: "pointer", transition: "all 0.2s" };
const emptyHint = { padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: 12, fontStyle: "italic" };
const noStatsBanner = { marginTop: 16, padding: "14px", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 12, color: "#b91c1c", fontSize: 13, textAlign: "center", fontWeight: 500 };
const matchBox = { background: "white", padding: 14, borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" };
const matchTeam = { fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "capitalize" };
const matchDate = { fontSize: 11, color: "#94a3b8" };
const matchStat = { fontSize: 12, fontWeight: 600, color: "#64748b" };
const loadingContainer = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" };
const spinnerStyle = { width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" };
const errorContainer = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", padding: 20 };
const homeBtn = { background: "#4f46e5", color: "white", padding: "12px 24px", borderRadius: 12, border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)" };
const backBtn = { padding: "8px 16px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", fontWeight: 600, fontSize: 13, color: "#475569", cursor: "pointer" };