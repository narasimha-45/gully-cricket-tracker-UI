import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL;

export default function TeamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState("overall");
  const [loading, setLoading] = useState(true);
  // const [recentMatches, setRecentMatches] = useState([]);

  useEffect(() => {
    loadTeam();
  }, [id]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/stats/team/${encodeURIComponent(id)}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        // await loadRecentMatches(json.data);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error("Failed to load team stats", err);
    } finally {
      setLoading(false);
    }
  };

  // const loadRecentMatches = async (teamData) => {
  //   // Collect the last 3 match IDs from wonBattingFirst, lostBattingFirst,
  //   // wonBowlingFirst, lostBowlingFirst — merge and sort by recency (order in array).
  //   // The API returns recentMatches arrays in reverse-chron order.
  //   const stats = teamData?.stats || {};

  //   const tagged = [
  //     ...(stats.wonBattingFirst?.recentMatches || []).map((id) => ({ id, result: "won", mode: "bat first" })),
  //     ...(stats.lostBattingFirst?.recentMatches || []).map((id) => ({ id, result: "lost", mode: "bat first" })),
  //     ...(stats.wonBowlingFirst?.recentMatches || []).map((id) => ({ id, result: "won", mode: "bowl first" })),
  //     ...(stats.lostBowlingFirst?.recentMatches || []).map((id) => ({ id, result: "lost", mode: "bowl first" })),
  //   ];

  //   // Fetch individual match details for the first 3 unique IDs
  //   const seen = new Set();
  //   const unique = [];
  //   for (const m of tagged) {
  //     if (!seen.has(m.id)) {
  //       seen.add(m.id);
  //       unique.push(m);
  //     }
  //     if (unique.length === 3) break;
  //   }

  //   try {
  //     const fetched = await Promise.all(
  //       unique.map(async (m) => {
  //         try {
  //           const r = await fetch(`${API}/api/matches/${m.id}`);
  //           const j = await r.json();
  //           return { ...m, match: j.success ? j.data : null };
  //         } catch {
  //           return { ...m, match: null };
  //         }
  //       })
  //     );
  //     setRecentMatches(fetched);
  //   } catch {
  //     setRecentMatches(unique.map((m) => ({ ...m, match: null })));
  //   }
  // };

  if (loading && !data)
    return (
      <div style={loadingContainer}>
        <div style={spinnerStyle} />
        <div style={{ marginTop: 16, color: "var(--color-slate-500)", fontWeight: 500 }}>
          Fetching team data...
        </div>
      </div>
    );

  if (!data)
    return (
      <div style={errorContainer}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🛡️</div>
        <h2 style={{ margin: "0 0 8px", color: "var(--color-slate-900)" }}>Team not found</h2>
        <p style={{ margin: "0 0 24px", color: "var(--color-slate-500)", maxWidth: 280, lineHeight: 1.5 }}>
          We couldn't find any team with the name "{id}".
        </p>
        <button onClick={() => navigate("/")} style={homeBtn}>
          Go to Home
        </button>
      </div>
    );

  const { profile, stats: rootStats, derived: rootDerived, seasons = [] } = data || {};


  const activeSeason =
    selectedSeason === "overall"
      ? null
      : seasons.find((s) => String(s.season?._id) === selectedSeason);

  const stats = (activeSeason ? activeSeason.stats : rootStats) || {};
  const derived = (activeSeason ? activeSeason.derived : rootDerived) || {};
  const seasonsPlayed = profile?.seasonsPlayed || [];

  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  const defendWins = stats.wonBattingFirst?.count || 0;
  const defendLosses = stats.lostBattingFirst?.count || 0;
  const defendTotal = defendWins + defendLosses;
  const defendWinPct = defendTotal ? Math.round((defendWins / defendTotal) * 100) : 0;

  const chaseWins = stats.wonBowlingFirst?.count || 0;
  const chaseLosses = stats.lostBowlingFirst?.count || 0;
  const chaseTotal = chaseWins + chaseLosses;
  const chaseWinPct = chaseTotal ? Math.round((chaseWins / chaseTotal) * 100) : 0;

  const nrr = parseFloat(derived.netRunRate ?? 0);
  const nrrStr = (nrr > 0 ? "+" : "") + nrr.toFixed(3);
  const nrrPositive = nrr >= 0;

  const initials = (profile?.name || "T")[0].toUpperCase();

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 0, paddingBottom: 60 }}>
      {/* NAV */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => navigate(-1)} style={backBtn}>← Back</button>
        <select
          style={seasonSelect}
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
        >
          <option value="overall">All seasons</option>
          {seasons.map((s) => (
            <option key={s.season?._id} value={s.season?._id}>
              {s.season?.name || s.season?.seasonName || "Season"}
            </option>
          ))}
        </select>
      </div>

      {/* HERO CARD */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={avatar}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-slate-900)", textTransform: "capitalize" }}>
              {profile?.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-slate-500)", marginTop: 2 }}>
              {seasonsPlayed.length} season{seasonsPlayed.length !== 1 ? "s" : ""} 
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 500, color: "var(--color-slate-900)" }}>{stats.played || 0}</div>
            <div style={{ fontSize: 11, color: "var(--color-slate-400)" }}>played</div>
          </div>
        </div>

        {/* WIN/LOSS BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 500, marginBottom: 7 }}>
          <span style={{ color: "#27500A" }}>{stats.wins || 0} wins</span>
          <span style={{ color: "var(--color-slate-500)" }}>{stats.ties || 0} ties</span>
          <span style={{ color: "#791F1F" }}>{stats.losses || 0} losses</span>
        </div>
        <div style={{ height: 7, borderRadius: 99, background: "var(--color-slate-100)", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${winPct}%`, background: "#639922" }} />
          <div style={{ flex: 1, background: "#E24B4A" }} />
        </div>

        {/* BADGES */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
          <Badge color={nrrPositive ? "green" : "red"}>
            {nrrPositive ? "↑" : "↓"} NRR {nrrStr}
          </Badge>
          <Badge color="gray">{winPct}% win rate</Badge>
        </div>
      </div>

      {/* NO DATA HINT */}
      {activeSeason && !activeSeason.stats && (
        <div style={noStatsBanner}>
          ⚠️ No performance data found for this team in the selected season.
        </div>
      )}

      {/* RECENT FORM
      <SectionTitle>Recent form</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recentMatches.length > 0 ? (
          recentMatches.map((m, i) => (
            <RecentMatchCard key={i} item={m} teamName={profile?.name} />
          ))
        ) : (
          <div style={emptyHint}>No recent matches found.</div>
        )}
      </div> */}

      {/* BATTING & BOWLING */}
      <SectionTitle>Batting &amp; bowling</SectionTitle>
      <div style={grid2}>
        <StatTile label="Runs scored" value={stats.runsScored || 0} sub={`${derived.oversFaced || "—"} overs faced`} />
        <StatTile label="Runs conceded" value={stats.runsConceded || 0} sub={`${derived.oversBowled || "—"} overs bowled`} />
        <StatTile label="Batting SR" value={derived.battingStrikeRate || "0.00"} />
        <StatTile label="Economy" value={derived.economy || "0.00"} />
        <StatTile label="Batting avg" value={derived.battingAverage || "0.00"} />
        <StatTile label="Bowling avg" value={derived.bowlingAverage || "0.00"} />
        <StatTile label="Wickets lost" value={stats.wicketsLost || 0} />
        <StatTile label="Wickets taken" value={stats.wicketsTaken || 0} />
      </div>

      {/* RECORD SCORES */}
      <SectionTitle>Record scores</SectionTitle>
      <div style={card}>
        <Row
          label="Highest score"
          value={
            stats.highestScore?.runs != null
              ? `${stats.highestScore.runs}/${stats.highestScore.wickets} (${stats.highestScore.overs} ov)`
              : "—"
          }
        />
        <Row
          label="Lowest score"
          value={
            stats.lowestScore?.runs != null
              ? `${stats.lowestScore.runs}/${stats.lowestScore.wickets} (${stats.lowestScore.overs} ov)`
              : "—"
          }
        />
        <Row label="Overs faced" value={derived.oversFaced || "—"} />
        <Row label="Overs bowled" value={derived.oversBowled || "—"} last />
      </div>

      {/* DEFENDING */}
      <SectionTitle>Defending (bat first)</SectionTitle>
      <div style={{ ...grid2, marginBottom: 8 }}>
        <SplitTile color="green" label="Won" value={defendWins} sub={`${defendWinPct}% success`} />
        <SplitTile color="red" label="Lost" value={defendLosses} sub={`${100 - defendWinPct}% failure`} />
      </div>
      <div style={card}>
        <Row
          label="Lowest total defended"
          value={stats.lowestDefendedScore?.defended != null ? `${stats.lowestDefendedScore.defended} runs` : "—"}
        />
        <Row
          label="Highest total posted"
          value={
            stats.highestScore?.runs != null
              ? `${stats.highestScore.runs}/${stats.highestScore.wickets} (${stats.highestScore.overs} ov)`
              : "—"
          }
          last
        />
      </div>

      {/* CHASING */}
      <SectionTitle>Chasing (bowl first)</SectionTitle>
      <div style={{ ...grid2, marginBottom: 8 }}>
        <SplitTile color="green" label="Won" value={chaseWins} sub={`${chaseWinPct}% success`} />
        <SplitTile color="red" label="Lost" value={chaseLosses} sub={`${100 - chaseWinPct}% failure`} />
      </div>
      <div style={card}>
        <Row
          label="Highest successful chase"
          value={
            stats.highestSuccessfulChase?.target != null
              ? `${stats.highestSuccessfulChase.achieved} (target ${stats.highestSuccessfulChase.target})`
              : "—"
          }
          last
        />
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}

/* ── RECENT MATCH CARD ── */
// Derives opponent name and result description from match data.
// Your match API response shape may differ — adjust field paths accordingly.
function RecentMatchCard({ item, teamName }) {
  const { result, mode, match } = item;
  const isWin = result === "won";

  // Try to derive opponent and margin from match data if available
  let opponent = "Opponent";
  let margin = null;

  if (match) {
    // Adjust these field paths to match your actual /api/matches/:id response shape
    const teams = match.teams || [];
    const other = teams.find(
      (t) => t.name?.toLowerCase() !== teamName?.toLowerCase()
    );
    if (other?.name) opponent = other.name;

    if (isWin) {
      if (match.result?.margin && match.result?.by) {
        margin = `by ${match.result.margin} ${match.result.by}`;
      }
    } else {
      if (match.result?.margin && match.result?.by) {
        margin = `by ${match.result.margin} ${match.result.by}`;
      }
    }
  }

  const modeLabel =
    mode === "bat first"
      ? isWin
        ? "Bat first · defended"
        : "Bat first · chased down"
      : isWin
      ? "Bowl first · chased"
      : "Bowl first · failed chase";

  return (
    <div style={matchCard}>
      <div style={{ ...matchPill, background: isWin ? "#639922" : "#E24B4A" }} />
      <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3, color: isWin ? "#3B6D11" : "#A32D2D" }}>
          {isWin ? "Won" : "Lost"}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-slate-900)", textTransform: "capitalize" }}>
          {isWin ? "vs" : "lost to"} {opponent}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-slate-400)", marginTop: 3 }}>{modeLabel}</div>
      </div>
      {margin && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-slate-900)" }}>{margin}</div>
          <div style={{ fontSize: 10, color: "var(--color-slate-400)", marginTop: 1 }}>margin</div>
        </div>
      )}
    </div>
  );
}

/* ── SUB-COMPONENTS ── */

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-slate-400)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "24px 0 10px", paddingLeft: 2 }}>
    {children}
  </div>
);

const StatTile = ({ label, value, sub }) => (
  <div style={{ background: "white", borderRadius: 12, padding: 14, border: "1px solid var(--color-slate-200)" }}>
    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5, color: "var(--color-slate-400)" }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-slate-900)" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "var(--color-slate-500)", marginTop: 3 }}>{sub}</div>}
  </div>
);

const SplitTile = ({ label, value, sub, color }) => {
  const isGreen = color === "green";
  return (
    <div style={{
      borderRadius: 12,
      padding: 14,
      border: "1px solid var(--color-slate-200)",
      background: isGreen ? "#EAF3DE" : "#FCEBEB",
    }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, color: isGreen ? "#3B6D11" : "#A32D2D" }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 500, color: isGreen ? "#27500A" : "#791F1F" }}>{value}</div>
      <div style={{ fontSize: 11, marginTop: 3, color: isGreen ? "#3B6D11" : "#A32D2D" }}>{sub}</div>
    </div>
  );
};

const Row = ({ label, value, last }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: last ? "none" : "1px solid var(--color-slate-100)" }}>
    <span style={{ fontSize: 13, color: "var(--color-slate-500)" }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-slate-900)" }}>{value}</span>
  </div>
);

const Badge = ({ children, color }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 8, ...badgeColors[color] }}>
    {children}
  </span>
);

const badgeColors = {
  green: { background: "#EAF3DE", color: "#27500A" },
  red: { background: "#FCEBEB", color: "#791F1F" },
  gray: { background: "var(--color-slate-50)", color: "var(--color-slate-600)" },
};

/* ── STYLES ── */

const card = {
  background: "white",
  borderRadius: 16,
  border: "1px solid var(--color-slate-200)",
  padding: 18,
};
const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 8,
};
const avatar = {
  width: 52,
  height: 52,
  borderRadius: "50%",
  background: "#EAF3DE",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: 500,
  color: "#27500A",
};
const seasonSelect = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--color-slate-200)",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--color-slate-600)",
  background: "white",
  outline: "none",
};
const noStatsBanner = {
  marginTop: 16,
  padding: 14,
  background: "var(--color-red-50)",
  border: "1px solid var(--color-red-100)",
  borderRadius: 12,
  color: "var(--color-red-700)",
  fontSize: 13,
  textAlign: "center",
  fontWeight: 500,
};
const loadingContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "60vh",
};
const spinnerStyle = {
  width: 32,
  height: 32,
  border: "3px solid var(--color-slate-200)",
  borderTop: "3px solid var(--color-indigo-500)",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
const errorContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "70vh",
  padding: 20,
};
const homeBtn = {
  background: "var(--color-indigo-600)",
  color: "white",
  padding: "12px 24px",
  borderRadius: 12,
  border: "none",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};
const backBtn = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "1px solid var(--color-slate-200)",
  background: "white",
  fontWeight: 500,
  fontSize: 13,
  color: "var(--color-slate-600)",
  cursor: "pointer",
};
const matchCard = {
  background: "white",
  border: "1px solid var(--color-slate-200)",
  borderRadius: 12,
  display: "flex",
  alignItems: "stretch",
  overflow: "hidden",
};
const matchPill = {
  width: 4,
  flexShrink: 0,
};
const emptyHint = {
  padding: 16,
  textAlign: "center",
  color: "var(--color-slate-400)",
  fontSize: 13,
  fontStyle: "italic",
  background: "white",
  border: "1px solid var(--color-slate-200)",
  borderRadius: 12,
};