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
      navigate(`/season/${seasonId}/match/${match._id}`);
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
    (m) => m.status === "setup" || m.status === "LIVE"
  );

  const completedMatches = serverMatches.filter(
    (m) => m.status === "COMPLETED"
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
            <p style={muted}>Loading live matches…</p>
          ) : liveMatches.length === 0 ? (
            <p style={muted}>No live matches</p>
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
            <p style={muted}>Loading completed matches…</p>
          ) : completedMatches.length === 0 ? (
            <p style={muted}>No completed matches</p>
          ) : (
            <div style={list}>
              {completedMatches.map((match) => (
                <div
                  key={match._id}
                  style={card}
                  onClick={() => handleMatchClick(match, "SERVER")}
                >
                  {/* DATE & TIME */}
                  <div style={dateText}>
                    {formatDateTime(match.startTime || match.createdAt)}
                  </div>
                  {/* TEAM A */}
                  <div style={row}>
                    <div
                      style={{
                        ...teamLeft,
                        fontWeight: isWinner(
                          match.innings[0].battingTeam,
                          match
                        )
                          ? 600
                          : 400,
                      }}
                    >
                      {/* <span style={flag}></span> */}
                      {match.innings[0].battingTeam}
                    </div>

                    <div
                      style={{
                        ...score,
                        fontWeight: isWinner(
                          match.innings[1].battingTeam,
                          match
                        )
                          ? 600
                          : 400,
                      }}
                    >
                      {getScoreLine(match.innings?.[0])}
                    </div>
                  </div>

                  {/* TEAM B */}
                  <div style={row}>
                    <div
                      style={{
                        ...teamLeft,
                        fontWeight: isWinner(match.innings[1].battingTeam, match)
                          ? 600
                          : 400,
                      }}
                    >
                      {/* <span style={flag}>🇮🇳</span> */}
                      {match.innings[1].battingTeam}
                    </div>

                    <div
                      style={{
                        ...score,
                        fontWeight: isWinner(match.teams.teamB.name, match)
                          ? 600
                          : 400,
                      }}
                    >
                      {getScoreLine(match.innings?.[1])}
                    </div>
                  </div>

                  {/* RESULT */}
                  <div style={resultLine}>
                    {match.result.winner} won by {match.result.margin}{" "}
                    {match.result.type === "RUNS" ? "runs" : "wkts"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- STYLES ---------------- */

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

const resultLine = {
  marginTop: 6,
  fontSize: 13,
  color: "#2563eb", // blue like screenshot
};

const dateText = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 6,
};

const scoreText = {
  fontSize: 13,
  marginTop: 4,
  fontWeight: 500,
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
