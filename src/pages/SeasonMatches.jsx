import { useEffect, useState } from "react";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import {
  getMatchesBySeason,
  deleteMatch as deleteLocalMatchDB,
} from "../storage/matchDB";
import { formatName } from "../utils/helpers";

export default function SeasonMatches() {
  const { seasonId } = useParams();

  const navigate = useNavigate();

  const API = import.meta.env.VITE_API_BASE_URL;

  /* ---------------------------------------
     TAB STATE
  --------------------------------------- */

  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get("tab") || "LIVE";

  /* ---------------------------------------
     LOCAL MATCHES
  --------------------------------------- */

  const [localMatches, setLocalMatches] = useState([]);

  const [localLoading, setLocalLoading] = useState(true);

  const loadLocalMatches = async () => {
    setLocalLoading(true);

    const local = await getMatchesBySeason(seasonId);

    setLocalMatches(local || []);

    setLocalLoading(false);
  };

  useEffect(() => {
    loadLocalMatches();
  }, [seasonId]);

  /* ---------------------------------------
     SERVER MATCHES
  --------------------------------------- */

  const { data: serverMatches = [], isLoading: serverLoading } = useQuery({
    queryKey: ["seasonMatches", seasonId],

    queryFn: async () => {
      const res = await fetch(`${API}/seasons/matches/${seasonId}`);

      const json = await res.json();
      return json || [];
    },

    staleTime: 1000 * 60 * 5,

    refetchOnWindowFocus: false,
  });


  /* ---------------------------------------
     FILTER + SORT STATE
  --------------------------------------- */

  const [sortOrder, setSortOrder] = useState("NEWEST");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [resultFilter, setResultFilter] = useState("ALL");

  /* ---------------------------------------
     ACTIONS
  --------------------------------------- */

  const deleteLocalMatch = async (e, matchId) => {
    e.stopPropagation();

    if (!window.confirm("Delete this match?")) return;

    await deleteLocalMatchDB(matchId);

    loadLocalMatches();
  };

  const handleMatchClick = (match, source) => {
    // COMPLETED MATCH

    if (source === "SERVER") {
      navigate(`/season/${seasonId}/match/${match.id}`);

      return;
    }

    // SETUP MATCH

    if (match.status === "setup") {
      if (match.toss) {
        navigate(`/season/${seasonId}/match/${match.id}/live`);
      } else {
        navigate(`/season/${seasonId}/match/${match.id}/toss`);
      }

      return;
    }

    // LIVE MATCH

    if (match.status === "LIVE") {
      navigate(`/season/${seasonId}/match/${match.id}/live`);
    }
  };

  /* ---------------------------------------
     FILTERS
  --------------------------------------- */

  const liveMatches = localMatches.filter(
    (m) => m.status === "setup" || m.status === "LIVE",
  );

  const completedMatches = serverMatches.filter(
    (m) => m.matchStatus === "COMPLETED",
  );

  /* ---------------------------------------
     HELPERS
  --------------------------------------- */

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

    return `${inning.totalRuns}-${inning.wickets} (${ballsToOvers(
      inning.balls,
    )})`;
  };

  const isWinner = (teamName, match) => match.winner === teamName;

  /* ---------------------------------------
     FILTERED + SORTED COMPLETED MATCHES
  --------------------------------------- */

  const teamOptions = [
    ...new Set(
      serverMatches.flatMap((m) => [m.teamA, m.teamB]).filter(Boolean),
    ),
  ].sort();

  const filteredCompletedMatches = completedMatches
    .filter((m) => {
      if (teamFilter === "ALL") return true;
      return m.teamA === teamFilter || m.teamB === teamFilter;
    })
    .filter((m) => {
      if (teamFilter === "ALL" || resultFilter === "ALL") return true;
      const won = isWinner(teamFilter, m);
      return resultFilter === "WON" ? won : !won;
    })
    .sort((a, b) => {
      const dateA = new Date(a.completedAt || a.createdAt).getTime();
      const dateB = new Date(b.completedAt || b.createdAt).getTime();
      return sortOrder === "NEWEST" ? dateB - dateA : dateA - dateB;
    });

  /* ---------------------------------------
     UI
  --------------------------------------- */

  return (
    <div>
      {/* TABS */}

      <div style={tabs}>
        <button
          style={tab === "LIVE" ? activeTab : tabBtn}
          onClick={() =>
            setSearchParams({
              tab: "LIVE",
            })
          }
        >
          Live
        </button>

        <button
          style={tab === "COMPLETED" ? activeTab : tabBtn}
          onClick={() =>
            setSearchParams({
              tab: "COMPLETED",
            })
          }
        >
          Completed
        </button>
      </div>

      {/* LIVE TAB */}

      {tab === "LIVE" && (
        <>
          {localLoading ? (
            <div style={emptyState}>
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
                      {formatName(match.teams.teamA.name)} vs{" "}
                      {formatName(match.teams.teamB.name)}
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
          <div style={filterBar}>
            <select
              style={filterSelect}
              value={teamFilter}
              onChange={(e) => {
                setTeamFilter(e.target.value);
                setResultFilter("ALL");
              }}
            >
              <option value="ALL">All Teams</option>
              {teamOptions.map((team) => (
                <option key={team} value={team}>
                  {formatName(team)}
                </option>
              ))}
            </select>

            <select
              style={filterSelect}
              value={resultFilter}
              disabled={teamFilter === "ALL"}
              onChange={(e) => setResultFilter(e.target.value)}
            >
              <option value="ALL">Won & Lost</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>

            <select
              style={filterSelect}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
            </select>
          </div>

          {serverLoading ? (
            <div style={emptyState}>
              <div style={spinner}></div>

              <p style={muted}>Loading completed matches...</p>
            </div>
          ) : filteredCompletedMatches.length === 0 ? (
            <div style={emptyState}>
              <p style={emptyTitle}>No matches found</p>

              <p style={muted}>
                {teamFilter === "ALL"
                  ? "Finished matches will appear here"
                  : "Try a different team or result filter"}
              </p>
            </div>
          ) : (
            <div style={list}>
              {filteredCompletedMatches.map((match) => {
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
                      {formatDateTime(match.completedAt || match.createdAt)}
                    </div>

                    {/* TEAM 1 */}

                    <div style={matchRow}>
                      <div
                        style={{
                          ...teamLeft,

                          fontWeight: isWinner(match.teamA, match) ? 700 : 500,

                          color: isWinner(match.teamA, match)
                            ? "#111827"
                            : "#6b7280",
                        }}
                      >
                        {formatName(match.teamA)}
                      </div>

                      <div
                        style={{
                          ...scoreText,

                          fontWeight: isWinner(match.teamA, match) ? 700 : 500,

                          color: isWinner(match.teamA, match)
                            ? "#111827"
                            : "#6b7280",
                        }}
                      >
                        {match.teamAScore
                          ? `${match.teamAScore}-${match.teamAWickets} (${ballsToOvers(match.teamABallsFaced)})`
                          : "-"}
                      </div>
                    </div>

                    {/* TEAM 2 */}

                    <div style={matchRow}>
                      <div
                        style={{
                          ...teamLeft,

                          fontWeight: isWinner(match.teamB, match) ? 700 : 500,

                          color: isWinner(match.teamB, match)
                            ? "#111827"
                            : "#6b7280",
                        }}
                      >
                        {formatName(match.teamB)}
                      </div>

                      <div
                        style={{
                          ...scoreText,

                          fontWeight: isWinner(match.teamB, match) ? 700 : 500,

                          color: isWinner(match.teamB, match)
                            ? "#111827"
                            : "#6b7280",
                        }}
                      >
                        {match.teamBScore
                          ? `${match.teamBScore}-${match.teamBWickets} (${ballsToOvers(match.teamBBallsFaced)})`
                          : "-"}
                      </div>
                    </div>

                    {/* RESULT */}

                    <div style={resultLine}>{match.wonBy}</div>
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

/* ---------------------------------------
   STYLES
--------------------------------------- */

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

  border: "3px solid #e0e7ff",

  borderTop: "3px solid #4338ca",

  borderRadius: "50%",

  animation: "spin 0.8s linear infinite",

  margin: "0 auto 14px",
};

const teamLeft = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
};

const dateText = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 6,
};

const tabs = {
  position: "sticky",

  top: 159,

  zIndex: 80,

  display: "flex",

  gap: 8,

  margin: "0 -18px 16px -18px",

  padding: "0 18px 10px 18px",

  background: "rgba(248,250,252,0.92)",

  backdropFilter: "blur(12px)",
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

const filterBar = {
  display: "flex",
  gap: 8,
  marginBottom: 14,
};

const filterSelect = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontSize: 13,
  color: "#374151",
  cursor: "pointer",
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

const muted = {
  color: "#6b7280",
};
