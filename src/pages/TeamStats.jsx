import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { formatName } from "../utils/helpers";
import LoadingState from "../components/common/LoadingState";
import { api } from "../components/common/api";

export default function TeamStats() {
  const { globalFilter } = useOutletContext();
  const navigate = useNavigate();
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStandings();
  }, [globalFilter]);

  const fetchStandings = async () => {
    try {
      setLoading(true);
      const json = await api.stats.getTeamLeaderboard({
        seasonId:
          globalFilter && globalFilter !== "all" ? globalFilter : undefined,
      });
      setStandings(json || []);
    } catch (err) {
      console.error("Failed to fetch standings", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState label="Loading standings..." />;

  return (
    <div style={container}>
      {/* TABLE HEADER */}
      <div style={headerRow}>
        <span style={{ flex: 2 }}>Team</span>
        <span style={centerCol}>P</span>
        <span style={centerCol}>W</span>
        <span style={centerCol}>L</span>
        <span style={centerCol}>NRR</span>
        {/* <span style={centerCol}>Pts</span> */}
      </div>

      {/* ROWS */}
      {standings.length > 0 ? (
        standings.map((t, i) => (
          <div
            key={t.name}
            style={row}
            onClick={() => navigate(`/team/${encodeURIComponent(t.name)}`)}
          >
            <div
              style={{
                flex: 2,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={rank}>{i + 1}</span>
              <span style={teamName}>{formatName(t.name)}</span>
            </div>
            <span style={centerCol}>{t.matchesPlayed}</span>
            <span style={centerCol}>{t.matchesWon}</span>
            <span style={centerCol}>{t.matchesLost}</span>
            <span
              style={{
                ...centerCol,
                color: t.derived.netRunRate >= 0 ? "#16a34a" : "#dc2626",
                fontWeight: 600,
              }}
            >
              {t.derived.netRunRate > 0 ? "+" : ""}
              {t.derived.netRunRate}
            </span>
            {/* <span style={{ ...centerCol, fontWeight: 800, color: "#1e293b" }}>{t.stats.points}</span> */}
          </div>
        ))
      ) : (
        <div style={empty}>No standings data available for this filter.</div>
      )}
    </div>
  );
}

const container = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const headerRow = {
  display: "flex",
  padding: "10px 16px",
  background: "#f1f5f9",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const row = {
  display: "flex",
  alignItems: "center",
  padding: "16px",
  background: "white",
  borderRadius: 16,
  border: "1px solid #eef2ff",
  cursor: "pointer",
  transition: "transform 0.2s",
};

const rank = {
  fontSize: 12,
  color: "#94a3b8",
  fontWeight: 600,
  width: 20,
};

const teamName = {
  fontWeight: 700,
  color: "#1e293b",
  fontSize: 15,
};

const centerCol = {
  flex: 1,
  textAlign: "center",
  fontSize: 14,
  color: "#475569",
};

const loadingWrap = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "40px 0",
};

const spinner = {
  width: 32,
  height: 32,
  border: "3px solid #e2e8f0",
  borderTop: "3px solid #4f46e5",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const loadingText = {
  marginTop: 16,
  color: "#64748b",
  fontSize: 14,
};

const empty = {
  textAlign: "center",
  padding: "40px 20px",
  color: "#64748b",
  fontSize: 14,
  background: "#f8fafc",
  borderRadius: 16,
  border: "1px dashed #cbd5e1",
};
