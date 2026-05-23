import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL;

export default function TeamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState("overall");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeam();
  }, [id]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API}/api/stats/team/${encodeURIComponent(id)}`,
      );
      const json = await res.json();
      if (json.success) setData(json.data);
      else setData(null);
    } catch (err) {
      console.error("Failed to load team stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data)
    return (
      <div style={loadingContainer}>
        <div style={spinnerStyle} />
        <div style={{ marginTop: 16, color: "#64748b", fontWeight: 500 }}>
          Fetching team data...
        </div>
      </div>
    );

  if (!data)
    return (
      <div style={errorContainer}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🛡️</div>
        <h2 style={{ margin: "0 0 8px", color: "#0f172a" }}>Team not found</h2>
        <p
          style={{
            margin: "0 0 24px",
            color: "#64748b",
            maxWidth: 280,
            lineHeight: 1.5,
          }}
        >
          We couldn't find any team with the name "{id}".
        </p>
        <button onClick={() => navigate("/")} style={homeBtn}>
          Go to Home
        </button>
      </div>
    );

  // With this:
  const {
    profile,
    stats: rootStats,
    derived: rootDerived,
    seasons = [],
  } = data || {};

  const activeSeason =
    selectedSeason === "overall"
      ? null
      : seasons.find((s) => String(s.season?._id) === selectedSeason);

  const stats = (activeSeason ? activeSeason.stats : rootStats) || {};
  const derived = (activeSeason ? activeSeason.derived : rootDerived) || {};
  const seasonsPlayed = profile?.seasonsPlayed || [];

  /* ── Computed ── */
  const winPct = stats.played
    ? Math.round((stats.wins / stats.played) * 100)
    : 0;

  const defendWins = stats.wonBattingFirst?.count || 0;
  const defendLosses = stats.lostBattingFirst?.count || 0;
  const defendTotal = defendWins + defendLosses;
  const defendWinPct = defendTotal
    ? Math.round((defendWins / defendTotal) * 100)
    : 0;

  const chaseWins = stats.wonBowlingFirst?.count || 0;
  const chaseLosses = stats.lostBowlingFirst?.count || 0;
  const chaseTotal = chaseWins + chaseLosses;
  const chaseWinPct = chaseTotal
    ? Math.round((chaseWins / chaseTotal) * 100)
    : 0;

  const nrr = parseFloat(derived.netRunRate ?? 0);
  const nrrStr = (nrr > 0 ? "+" : "") + nrr.toFixed(3);

  const initials = (profile?.name || "T")[0].toUpperCase();

  return (
    <div
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        paddingBottom: 60,
      }}
    >
      {/* NAV */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <button onClick={() => navigate(-1)} style={backBtn}>
          ← Back
        </button>
        <select
          style={seasonSelect}
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
        >
          <option value="overall">All Seasons (Overall)</option>
          {seasons.map((s) => (
            <option key={s.season?._id} value={s.season?._id}>
              {s.season?.name || s.season?.seasonName || "Season"}
            </option>
          ))}
        </select>
      </div>

      {/* HEADER CARD */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={avatar}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: "#0f172a",
                textTransform: "capitalize",
              }}
            >
              {profile?.name}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
              {seasonsPlayed.length} season
              {seasonsPlayed.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: "#0f172a" }}>
              {stats.played || 0}
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>played</div>
          </div>
        </div>

        <div style={divider} />

        {/* WIN/LOSS BAR */}
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              marginBottom: 6,
            }}
          >
            <span style={{ color: "#27500A", fontWeight: 600 }}>
              {stats.wins || 0} wins
            </span>
            <span style={{ color: "#64748b" }}>{stats.ties || 0} ties</span>
            <span style={{ color: "#791F1F", fontWeight: 600 }}>
              {stats.losses || 0} losses
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 99,
              background: "#f1f5f9",
              overflow: "hidden",
              display: "flex",
            }}
          >
            <div style={{ width: `${winPct}%`, background: "#639922" }} />
            <div style={{ flex: 1, background: "#E24B4A" }} />
          </div>
        </div>

        <div
          style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}
        >
          <Badge color="green">NRR {nrrStr}</Badge>
          {stats.biggestWins?.byRuns?.margin > 0 && (
            <Badge color="gray">
              Best win by runs: {stats.biggestWins.byRuns.margin}
            </Badge>
          )}
          {stats.biggestWins?.byWickets?.margin > 0 && (
            <Badge color="gray">
              Best win by wickets: {stats.biggestWins.byWickets.margin}
            </Badge>
          )}
        </div>
      </div>

      {/* NO DATA HINT */}
      {activeSeason && !activeSeason.stats && (
        <div style={noStatsBanner}>
          ⚠️ No performance data found for this team in the selected season.
        </div>
      )}

      {/* PERFORMANCE SUMMARY */}
      <SectionTitle>Performance summary</SectionTitle>
      <div style={grid2}>
        <StatTile label="Runs scored" value={stats.runsScored || 0} />
        <StatTile label="Runs conceded" value={stats.runsConceded || 0} />
        <StatTile
          label="Batting SR"
          value={derived.battingStrikeRate || "0.00"}
        />
        <StatTile label="Economy" value={derived.economy || "0.00"} />
        <StatTile
          label="Batting avg"
          value={derived.battingAverage || "0.00"}
        />
        <StatTile
          label="Bowling avg"
          value={derived.bowlingAverage || "0.00"}
        />
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
      <div style={grid2}>
        <StatTile
          label="Won"
          value={defendWins}
          color="green"
          sub={`${defendWinPct}% success`}
        />
        <StatTile
          label="Lost"
          value={defendLosses}
          color="red"
          sub={`${100 - defendWinPct}% failure`}
        />
      </div>
      <div style={{ ...card, marginTop: 10 }}>
        <Row
          label="Lowest total defended"
          value={
            stats.lowestDefendedScore?.defended != null
              ? `${stats.lowestDefendedScore.defended} runs`
              : "—"
          }
        />
        <Row
          label="Highest total defended"
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
      <div style={grid2}>
        <StatTile
          label="Won"
          value={chaseWins}
          color="green"
          sub={`${chaseWinPct}% success`}
        />
        <StatTile
          label="Lost"
          value={chaseLosses}
          color="red"
          sub={`${100 - chaseWinPct}% failure`}
        />
      </div>
      <div style={{ ...card, marginTop: 10 }}>
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

      {/* ROSTER */}
      <SectionTitle>Team roster</SectionTitle>
      <div style={card}>
        <div style={rosterGrid}>
          {profile?.players?.length > 0 ? (
            profile.players.map((player) => (
              <div
                key={player._id || player.name}
                style={rosterItem}
                onClick={() =>
                  navigate(`/player/${encodeURIComponent(player.name)}`)
                }
              >
                <span style={avatarMini}>
                  {(player.name || "P")[0].toUpperCase()}
                </span>
                <span style={rosterName}>{player.name}</span>
              </div>
            ))
          ) : (
            <div style={emptyHint}>No players registered.</div>
          )}
        </div>
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}

/* ── SUB-COMPONENTS ── */

const SectionTitle = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 700,
      color: "#94a3b8",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      margin: "28px 0 10px",
      paddingLeft: 4,
    }}
  >
    {children}
  </div>
);

const StatTile = ({ label, value, color, sub }) => (
  <div
    style={{
      background: "white",
      borderRadius: 16,
      padding: 16,
      border: "1px solid #e2e8f0",
      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    }}
  >
    <div
      style={{
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 6,
        color:
          color === "green"
            ? "#059669"
            : color === "red"
              ? "#dc2626"
              : "#94a3b8",
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{sub}</div>
    )}
  </div>
);

const Row = ({ label, value, last }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 0",
      borderBottom: last ? "none" : "1px solid #f1f5f9",
    }}
  >
    <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
      {value}
    </span>
  </div>
);

const Badge = ({ children, color }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 11,
      fontWeight: 600,
      padding: "4px 10px",
      borderRadius: 8,
      ...badgeColors[color],
    }}
  >
    {children}
  </span>
);

const badgeColors = {
  green: { background: "#f0fdf4", color: "#166534" },
  gray: { background: "#f8fafc", color: "#475569" },
};

/* ── STYLES ── */

const card = {
  background: "white",
  borderRadius: 18,
  border: "1px solid #e2e8f0",
  padding: 18,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};
const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 10,
};
const avatar = {
  width: 52,
  height: 52,
  borderRadius: "50%",
  background: "#f5f3ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: 700,
  color: "#5b21b6",
};
const divider = {
  border: "none",
  borderTop: "1px solid #f1f5f9",
  margin: "16px 0",
};
const seasonSelect = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 13,
  fontWeight: 600,
  color: "#475569",
  background: "white",
  outline: "none",
};
const noStatsBanner = {
  marginTop: 16,
  padding: 14,
  background: "#fef2f2",
  border: "1px solid #fee2e2",
  borderRadius: 12,
  color: "#b91c1c",
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
  border: "3px solid #e2e8f0",
  borderTop: "3px solid #6366f1",
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
  background: "#4f46e5",
  color: "white",
  padding: "12px 24px",
  borderRadius: 12,
  border: "none",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};
const backBtn = {
  padding: "8px 16px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "white",
  fontWeight: 600,
  fontSize: 13,
  color: "#475569",
  cursor: "pointer",
};
const rosterGrid = { display: "flex", flexDirection: "column", gap: 2 };
const rosterItem = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 4px",
  borderBottom: "1px solid #f8fafc",
  cursor: "pointer",
};
const avatarMini = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: "#f5f3ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
  color: "#5b21b6",
};
const rosterName = {
  fontSize: 14,
  fontWeight: 500,
  color: "#4f46e5",
  textTransform: "capitalize",
};
const emptyHint = {
  padding: 12,
  textAlign: "center",
  color: "#94a3b8",
  fontSize: 12,
  fontStyle: "italic",
};
