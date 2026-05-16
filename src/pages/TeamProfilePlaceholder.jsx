import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL;

export default function TeamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("overall");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    loadTeam();
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

  const loadTeam = async () => {
    try {
      setLoading(true);
      let url = `${API}/api/stats/team/${encodeURIComponent(id)}`;
      if (selectedSeason !== "overall") {
        url += `?seasonId=${selectedSeason}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setTeam(json.data);
      else setTeam(null);
    } catch (err) {
      console.error("Failed to load team stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !team) return (
    <div style={loadingContainer}>
      <div style={spinnerStyle}></div>
      <div style={{ marginTop: 16, color: "#64748b", fontWeight: 500 }}>Fetching team data...</div>
    </div>
  );

  if (!team) return (
    <div style={errorContainer}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🛡️</div>
      <h2 style={{ margin: "0 0 8px", color: "#0f172a" }}>Team not found</h2>
      <p style={{ margin: "0 0 24px", color: "#64748b", maxWidth: 280, lineHeight: 1.5 }}>
        We couldn't find any team with the name "{id}".
      </p>
      <button onClick={() => navigate("/")} style={homeBtn}>Go to Home</button>
    </div>
  );

  const { profile: p = {}, stats: sRaw, derived: dRaw } = team;

  // Defensive defaults
  const stats = sRaw || {
    played: 0, wins: 0, losses: 0, ties: 0, points: 0,
    runsScored: 0, runsConceded: 0, wicketsLost: 0, wicketsTaken: 0,
    biggestWin: { margin: 0, type: "—" },
    highestScore: { runs: 0, wickets: 0, overs: 0 },
    lowestScore: { runs: 0, wickets: 0, overs: 0 },
    defending: { wins: [], losses: [] },
    chasing: { wins: [], losses: [] },
    highestTotalDefended: { runs: 0, wickets: 0, overs: 0 },
    lowestTotalDefended: { runs: 0, wickets: 0, overs: 0 },
    highestSuccessfulChase: { runs: 0, wickets: 0, overs: 0 },
    lowestSuccessfulChase: { runs: 0, wickets: 0, overs: 0 },
  };

  const derived = dRaw || {
    nrr: "0.00", battingSR: "0.00", economy: "0.00",
    oversFaced: "0.0", oversBowled: "0.0",
  };

  const totalDefending = (stats.defending?.wins?.length || 0) + (stats.defending?.losses?.length || 0);
  const totalChasing   = (stats.chasing?.wins?.length || 0) + (stats.chasing?.losses?.length || 0);

  const defendWinPct = totalDefending
    ? Math.round(((stats.defending?.wins?.length || 0) / totalDefending) * 100)
    : 0;

  const chaseWinPct = totalChasing
    ? Math.round(((stats.chasing?.wins?.length || 0) / totalChasing) * 100)
    : 0;

  const winPct     = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const winBarPct  = `${winPct}%`;
  const lossBarPct = `${100 - winPct}%`;

  const initials = (p.name || "T").slice(0, 1).toUpperCase();

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
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
              {p.seasonsCount} season{p.seasonsCount !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: "#0f172a" }}>{stats.played}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>played</div>
          </div>
        </div>

        <div style={divider} />

        {/* WIN/LOSS BAR */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: "#27500A", fontWeight: 600 }}>{stats.wins} wins</span>
            <span style={{ color: "#64748b" }}>{stats.ties} ties</span>
            <span style={{ color: "#791F1F", fontWeight: 600 }}>{stats.losses} losses</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: "#f1f5f9", overflow: "hidden", display: "flex" }}>
            <div style={{ width: winBarPct, background: "#639922" }} />
            <div style={{ flex: 1, background: "#E24B4A" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          <Badge color="green">NRR {derived.nrr > 0 ? "+" : ""}{derived.nrr}</Badge>
          <Badge color="purple">{stats.points} pts</Badge>
          <Badge color="gray">Biggest win: {stats.biggestWin.margin} {stats.biggestWin.type?.toLowerCase()}</Badge>
        </div>
      </div>

      {/* NO STATS HINT */}
      {!sRaw && selectedSeason !== "overall" && (
        <div style={noStatsBanner}>
           ⚠️ No performance data found for this team in the selected season.
        </div>
      )}

      {/* BATTING & BOWLING */}
      <SectionTitle>Performance Summary</SectionTitle>
      <div style={grid2}>
        <StatTile label="Runs scored"    value={stats.runsScored} />
        <StatTile label="Runs conceded"  value={stats.runsConceded} />
        <StatTile label="Batting SR"     value={derived.battingSR} />
        <StatTile label="Economy"        value={derived.economy} />
        <StatTile label="Wickets lost"   value={stats.wicketsLost} />
        <StatTile label="Wickets taken"  value={stats.wicketsTaken} />
      </div>

      {/* TEAM SCORES */}
      <SectionTitle>Record Scores</SectionTitle>
      <div style={card}>
        <Row label="Highest score"  value={`${stats.highestScore.runs}/${stats.highestScore.wickets} (${stats.highestScore.overs} ov)`} />
        <Row label="Lowest score"   value={`${stats.lowestScore.runs}/${stats.lowestScore.wickets} (${stats.lowestScore.overs} ov)`} />
        <Row label="Overs faced"    value={derived.oversFaced} />
        <Row label="Overs bowled"   value={derived.oversBowled} last />
      </div>

      {/* DEFENDING */}
      <SectionTitle>Defending (Bat First)</SectionTitle>
      <div style={grid2}>
        <StatTile label="Wins"   value={stats.defending.wins.length}   color="green" sub={`${defendWinPct}% success`} />
        <StatTile label="Losses" value={stats.defending.losses.length} color="red"   sub={`${100 - defendWinPct}% failure`} />
      </div>
      <div style={{ ...card, marginTop: 10 }}>
        <Row
          label="Highest total defended"
          value={`${stats.highestTotalDefended.runs}/${stats.highestTotalDefended.wickets} (${stats.highestTotalDefended.overs} ov)`}
        />
        <Row
          label="Lowest total defended"
          value={`${stats.lowestTotalDefended.runs}/${stats.lowestTotalDefended.wickets} (${stats.lowestTotalDefended.overs} ov)`}
          last
        />
      </div>

      {/* CHASING */}
      <SectionTitle>Chasing (Bowl First)</SectionTitle>
      <div style={grid2}>
        <StatTile label="Wins"   value={stats.chasing.wins.length}   color="green" sub={`${chaseWinPct}% success`} />
        <StatTile label="Losses" value={stats.chasing.losses.length} color="red"   sub={`${100 - chaseWinPct}% failure`} />
      </div>
      <div style={{ ...card, marginTop: 10 }}>
        <Row
          label="Highest successful chase"
          value={`${stats.highestSuccessfulChase.runs}/${stats.highestSuccessfulChase.wickets} (${stats.highestSuccessfulChase.overs} ov)`}
        />
        <Row
          label="Lowest successful chase"
          value={`${stats.lowestSuccessfulChase.runs}/${stats.lowestSuccessfulChase.wickets} (${stats.lowestSuccessfulChase.overs} ov)`}
          last
        />
      </div>

      {/* ROSTER */}
      <SectionTitle>Team Roster</SectionTitle>
      <div style={card}>
        <div style={rosterGrid}>
          {p.players && p.players.length > 0 ? (
            p.players.map(player => (
              <div 
                key={player._id || player.name} 
                style={rosterItem}
                onClick={() => navigate(`/player/${encodeURIComponent(player.name)}`)}
              >
                <span style={avatarMini}>{(player.name || "P")[0].toUpperCase()}</span>
                <span style={rosterName}>{player.name}</span>
              </div>
            ))
          ) : (
            <div style={emptyHint}>No players registered for this season.</div>
          )}
        </div>
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}

/* ── SUB-COMPONENTS ── */

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "28px 0 10px", paddingLeft: 4 }}>
    {children}
  </div>
);

const StatTile = ({ label, value, color, sub }) => (
  <div style={{ background: "white", borderRadius: 16, padding: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
    <div style={{ fontSize: 10, color: color === "green" ? "#059669" : color === "red" ? "#dc2626" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{sub}</div>}
  </div>
);

const Row = ({ label, value, last }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: last ? "none" : "1px solid #f1f5f9" }}>
    <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{value}</span>
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
  green:  { background: "#f0fdf4", color: "#166534" },
  gray:   { background: "#f8fafc", color: "#475569" },
};

/* ── STYLES ── */

const card = { background: "white", borderRadius: 18, border: "1px solid #e2e8f0", padding: "18px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" };
const grid2 = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 };
const avatar = { width: 52, height: 52, borderRadius: "50%", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#5b21b6" };
const divider = { border: "none", borderTop: "1px solid #f1f5f9", margin: "16px 0" };
const seasonSelect = { padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 600, color: "#475569", background: "white", outline: "none" };

const noStatsBanner = { marginTop: 16, padding: "14px", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 12, color: "#b91c1c", fontSize: 13, textAlign: "center", fontWeight: 500 };

const loadingContainer = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" };
const spinnerStyle = { width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" };
const errorContainer = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", padding: 20 };
const homeBtn = { background: "#4f46e5", color: "white", padding: "12px 24px", borderRadius: 12, border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)" };
const backBtn = { padding: "8px 16px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", fontWeight: 600, fontSize: 13, color: "#475569", cursor: "pointer" };

const rosterGrid = { display: "flex", flexDirection: "column", gap: 2 };
const rosterItem = { display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: "1px solid #f8fafc", cursor: "pointer" };
const avatarMini = { width: 28, height: 28, borderRadius: "50%", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#5b21b6" };
const rosterName = { fontSize: 14, fontWeight: 500, color: "#4f46e5", textTransform: "capitalize" };
const emptyHint = { padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: 12, fontStyle: "italic" };