import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getMatchesBySeason,
  deleteMatch as deleteLocalMatchDB,
} from "../storage/matchDB";

export default function SeasonMatches() {
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_BASE_URL;

  // IndexedDB (setup + live)
  const [localMatches, setLocalMatches] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);

  // Backend (completed)
  const [serverMatches, setServerMatches] = useState([]);
  const [serverLoading, setServerLoading] = useState(true);

  const [tab, setTab] = useState("LIVE"); // LIVE | COMPLETED

  /* ---------------- LOADERS ---------------- */

  const loadLocalMatches = async () => {
    setLocalLoading(true);
    const local = await getMatchesBySeason(seasonId);
    setLocalMatches(local || []);
    setLocalLoading(false);
  };

  const loadServerMatches = async () => {
    setServerLoading(true);
    try {
      const res = await fetch(`${API}/api/matches/season/${seasonId}`);
      const json = await res.json();
      console.log("Fetched matches from server:", json.data);
      setServerMatches(json.data || []);
    } catch (e) {
      setServerMatches([]);
    } finally {
      setServerLoading(false);
    }
  };

  useEffect(() => {
    loadLocalMatches();
    loadServerMatches();
  }, [seasonId]);

  /* ---------------- ACTIONS ---------------- */

  const deleteLocalMatch = async (e, matchId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this match?")) return;

    await deleteLocalMatchDB(matchId);
    loadLocalMatches();
  };

  const handleMatchClick = (match, source) => {
    // COMPLETED (server)
    if (source === "SERVER") {
      navigate(`/season/${seasonId}/match/${match.id}`);
      return;
    }

    // LOCAL (setup / live)
    if (match.status === "setup") {
      if (match.toss) {
        navigate(`/season/${seasonId}/match/${match.id}/live`, {
          replace: true,
        });
      } else {
        navigate(`/season/${seasonId}/match/${match.id}/toss`);
      }
      return;
    }

    if (match.status === "LIVE") {
      navigate(`/season/${seasonId}/match/${match.id}/live`, {
        replace: true,
      });
    }
  };

  /* ---------------- FILTERS ---------------- */

  const liveMatches = localMatches.filter(
    (m) => m.status === "setup" || m.status === "LIVE",
  );

  const completedMatches = serverMatches.filter(
    (m) => m.status === "COMPLETED",
  );

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);

    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };
  const ballsToOvers = (balls = 0) => {
    const overs = Math.floor(balls / 6);
    const ballsPart = balls % 6;
    return `${overs}.${ballsPart}`;
  };

  const getScoreLine = (inning) => {
    if (!inning) return "";
    return `${inning.totalRuns}-${inning.wickets} (${ballsToOvers(inning.balls)})`;
  };

  const isWinner = (teamName, match) => match.result?.winner === teamName;

  /* ---------------- UI ---------------- */

  return (
    <div>
      {/* TABS (ALWAYS VISIBLE) */}
      <div style={tabs}>
        <button
          style={tab === "LIVE" ? activeTab : tabBtn}
          onClick={() => setTab("LIVE")}
        >
          Live
        </button>
        <button
          style={tab === "COMPLETED" ? activeTab : tabBtn}
          onClick={() => setTab("COMPLETED")}
        >
          Completed
        </button>
      </div>

      {/* LIVE TAB */}
      {tab === "LIVE" && (
        <>
          {localLoading ? (
            <div style={emptyState}>
              <style>
                {`
                  @keyframes spin {
                    to {
                      transform: rotate(360deg);
                    }
                  }
                `}
              </style>
              <div style={spinner}></div>
              <p style={muted}>Loading live matches...</p>
            </div>
          ) : liveMatches.length === 0 ? (
            <div style={emptyState}>
              <p style={emptyTitle}>No live matches</p>
              <p style={muted}>Create a match to start scoring</p>
            </div>
          ) : (
            <div style={list}>
              {liveMatches.map((match) => (
                <div
                  key={match.id}
                  style={card}
                  onClick={() => handleMatchClick(match, "LOCAL")}
                >
                  <div style={cardHeader}>
                    <strong>
                      {match.teams.teamA.name} vs {match.teams.teamB.name}
                    </strong>
                    <button
                      style={deleteBtn}
                      onClick={(e) => deleteLocalMatch(e, match.id)}
                    >
                      🗑
                    </button>
                  </div>

                  <div style={statusText}>
                    {match.status === "setup" ? "Setup" : "Live"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* COMPLETED TAB */}
      {tab === "COMPLETED" && (
        <>
          {serverLoading ? (
            <div style={emptyState}>
              <style>
                {`
                  @keyframes spin {
                    to {
                      transform: rotate(360deg);
                    }
                  }
                `}
              </style>

              <div style={spinner}></div>

              <p style={muted}>Loading completed matches...</p>
            </div>
          ) : completedMatches.length === 0 ? (
            <div style={emptyState}>
              <p style={emptyTitle}>No completed matches</p>

              <p style={muted}>Finished matches will appear here</p>
            </div>
          ) : (
            <div style={list}>
              {completedMatches.map((match) => {
                const innings1 = match.innings?.[0];

                const innings2 = match.innings?.[1];

                return (
                  <div
                    key={match._id}
                    style={completedCard}
                    onClick={() => handleMatchClick(match, "SERVER")}
                  >
                    {/* DATE */}
                    <div style={dateText}>
                      {formatDateTime(match.startTime || match.createdAt)}
                    </div>

                    {/* TEAM 1 */}
                    <div style={matchRow}>
                      <div
                        style={{
                          ...teamLeft,
                          fontWeight: isWinner(innings1?.battingTeam, match)
                            ? 700
                            : 500,

                          color: isWinner(innings1?.battingTeam, match)
                            ? "#111827"
                            : "#6b7280",
                        }}
                      >
                        {innings1?.battingTeam}
                      </div>

                      <div
                        style={{
                          ...scoreText,
                          fontWeight: isWinner(innings1?.battingTeam, match)
                            ? 700
                            : 500,

                          color: isWinner(innings1?.battingTeam, match)
                            ? "#111827"
                            : "#6b7280",
                        }}
                      >
                        {innings1 ? getScoreLine(innings1) : "-"}
                      </div>
                    </div>

                    {/* TEAM 2 */}
                    <div style={matchRow}>
                      <div
                        style={{
                          ...teamLeft,
                          fontWeight: isWinner(innings2?.battingTeam, match)
                            ? 700
                            : 500,

                          color: isWinner(innings2?.battingTeam, match)
                            ? "#111827"
                            : "#6b7280",
                        }}
                      >
                        {innings2?.battingTeam}
                      </div>

                      <div
                        style={{
                          ...scoreText,
                          fontWeight: isWinner(innings2?.battingTeam, match)
                            ? 700
                            : 500,

                          color: isWinner(innings2?.battingTeam, match)
                            ? "#111827"
                            : "#6b7280",
                        }}
                      >
                        {innings2 ? getScoreLine(innings2) : "-"}
                      </div>
                    </div>

                    {/* RESULT */}
                    <div style={resultLine}>
                      {match.result?.type === "TIE"
                        ? "Match Tied"
                        : `${match.result?.winner} won by ${
                            match.result?.margin
                          } ${match.result?.type === "RUNS" ? "runs" : "wkts"}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const completedCard = {
  background: "#fff",

  borderRadius: 18,

  padding: 16,

  border: "1px solid #eef2ff",

  boxShadow: "0 2px 10px rgba(15,23,42,0.05)",

  transition: "0.18s ease",

  cursor: "pointer",
};

const matchRow = {
  display: "flex",

  justifyContent: "space-between",

  alignItems: "center",

  marginTop: 10,
};

const scoreText = {
  fontSize: 15,

  fontWeight: 600,

  letterSpacing: -0.2,
};

const resultLine = {
  marginTop: 14,

  paddingTop: 12,

  borderTop: "1px solid #f3f4f6",

  fontSize: 13,

  fontWeight: 600,

  color: "#4338ca",
};

const emptyState = {
  padding: "40px 20px",
  textAlign: "center",
};

const emptyTitle = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 6,
};

const spinner = {
  width: 28,
  height: 28,
  border: "3px solid #e5e7eb",
  borderTop: "3px solid #4f46e5",
  borderRadius: "50%",
  margin: "0 auto 14px",
  animation: "spin 0.8s linear infinite",
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
};

const teamLeft = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
};

const flag = {
  fontSize: 18,
};

const score = {
  fontSize: 14,
};

const dateText = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 6,
};

const tabs = {
  display: "flex",
  gap: 8,
  marginBottom: 16,
};

const tabBtn = {
  flex: 1,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
};

const activeTab = {
  ...tabBtn,
  background: "#4f46e5",
  color: "#fff",
};

const list = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const card = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const deleteBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
};

const statusText = {
  fontSize: 12,
  color: "#6b7280",
  marginTop: 4,
};

const resultText = {
  fontSize: 13,
  marginTop: 6,
  fontWeight: 500,
};

const muted = {
  color: "#6b7280",
};
