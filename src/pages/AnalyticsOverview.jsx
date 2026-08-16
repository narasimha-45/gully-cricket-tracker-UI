import { useOutletContext, useNavigate } from "react-router-dom";
import LoadingState from "../components/common/LoadingState";
import { useBattingLeaderboard, useBowlingLeaderboard } from "../hooks/queries";

export default function AnalyticsOverview() {
  const { globalFilter } = useOutletContext();
  const navigate = useNavigate();
  const seasonId =
    globalFilter && globalFilter !== "all" ? globalFilter : undefined;

  const { data: batters = [], isLoading: battersLoading } =
    useBattingLeaderboard({ seasonId });
  const { data: bowlers = [], isLoading: bowlersLoading } =
    useBowlingLeaderboard({ seasonId });

  const topBatters = batters.slice(0, 3);
  const topBowlers = bowlers.slice(0, 3);

  if (battersLoading || bowlersLoading) {
    return <LoadingState label="Generating analytics summary…" />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* TOP BATTERS */}
      <div>
        <div style={sectionHeader}>
          <span style={{ fontSize: 18 }}>🏏</span>
          <h2 style={sectionTitle}>Leading Run Scorers</h2>
        </div>
        <div style={podiumRow}>
          {topBatters.map((p, i) => (
            <div
              key={p.name}
              style={{
                ...podiumCard,
                borderTopColor:
                  i === 0
                    ? "#fbbf24"
                    : i === 1
                      ? "var(--color-slate-400)"
                      : "#b45309",
              }}
              onClick={() => navigate(`/player/${encodeURIComponent(p.name)}`)}
            >
              <div style={rankBadge}>{i + 1}</div>
              <div style={playerName}>{p.name}</div>
              <div style={statLabel}>{p.runs} runs</div>
              <div style={subStat}>
                {p.innings} inn · {p.derived?.strikeRate} SR
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TOP BOWLERS */}
      <div>
        <div style={sectionHeader}>
          <span style={{ fontSize: 18 }}>🥎</span>
          <h2 style={sectionTitle}>Top Wicket Takers</h2>
        </div>
        <div style={podiumRow}>
          {topBowlers.map((p, i) => (
            <div
              key={p.name}
              style={{
                ...podiumCard,
                borderTopColor:
                  i === 0
                    ? "#fbbf24"
                    : i === 1
                      ? "var(--color-slate-400)"
                      : "#b45309",
              }}
              onClick={() => navigate(`/player/${encodeURIComponent(p.name)}`)}
            >
              <div style={rankBadge}>{i + 1}</div>
              <div style={playerName}>{p.name}</div>
              <div style={statLabel}>{p.wickets} wkts</div>
              <div style={subStat}>
                {p.derived?.economy} econ · {p.derived?.bowlingAverage} avg
              </div>
            </div>
          ))}
        </div>
      </div>

      <button style={fullLeaderboardBtn} onClick={() => navigate("../batting")}>
        View Detailed Leaderboards
      </button>
    </div>
  );
}

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 16,
  paddingLeft: 4,
};
const sectionTitle = {
  fontSize: 16,
  fontWeight: 700,
  color: "var(--color-slate-800)",
  margin: 0,
};

const podiumRow = { display: "flex", gap: 10 };
const podiumCard = {
  flex: 1,
  background: "white",
  borderRadius: 16,
  padding: "16px 12px",
  border: "1px solid var(--color-slate-200)",
  borderTopWidth: 4,
  textAlign: "center",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
  cursor: "pointer",
  transition: "transform 0.2s",
};

const rankBadge = {
  fontSize: 10,
  fontWeight: 800,
  background: "var(--color-slate-100)",
  color: "var(--color-slate-500)",
  width: 20,
  height: 20,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 10px",
};
const playerName = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--color-slate-900)",
  marginBottom: 4,
  textTransform: "capitalize",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const statLabel = {
  fontSize: 16,
  fontWeight: 800,
  color: "var(--color-indigo-600)",
  marginBottom: 4,
};
const subStat = {
  fontSize: 10,
  color: "var(--color-slate-400)",
  fontWeight: 500,
};

const fullLeaderboardBtn = {
  background: "white",
  border: "1px solid var(--color-slate-200)",
  padding: "14px",
  borderRadius: 14,
  fontSize: 14,
  fontWeight: 600,
  color: "var(--color-slate-600)",
  cursor: "pointer",
  marginTop: 10,
};
