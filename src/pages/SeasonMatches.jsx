import { useEffect, useState } from "react";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import {
  getMatchesBySeason,
  deleteMatch as deleteLocalMatchDB,
} from "../storage/matchDB";
import { formatName } from "../utils/helpers";
import { sameName } from "../utils/matchModel";
import { api } from "../api";

export default function SeasonMatches() {
  const { seasonId } = useParams();

  const navigate = useNavigate();

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
    const refresh = () => loadLocalMatches();
    window.addEventListener("gully:matches-changed", refresh);
    return () => window.removeEventListener("gully:matches-changed", refresh);
  }, [seasonId]);

  /* ---------------------------------------
     SERVER MATCHES
  --------------------------------------- */

  const { data: serverMatches = [], isLoading: serverLoading } = useQuery({
    queryKey: ["seasonMatches", seasonId],

    queryFn: async () => {
      const response = await api.seasons.getSeasonMatches(seasonId);
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.content)) return response.content;
      if (Array.isArray(response?.data)) return response.data;
      return [];
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
      navigate(`/season/${seasonId}/match/${match.id || match._id}`);

      return;
    }

    // A completed match can still be local when the device is offline or a
    // sync attempt failed. Keep it reviewable until backend confirmation.
    if (source === "LOCAL" && match.status === "COMPLETED") {
      navigate(`/season/${seasonId}/match/${match.id}/live`);
      return;
    }

    // SETUP MATCH

    if (match.status === "setup" || match.status === "SETUP") {
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
    (m) => m.status === "setup" || m.status === "SETUP" || m.status === "LIVE",
  );

  const pendingCompletedMatches = localMatches
    .filter((m) => m.status === "COMPLETED" && m.syncStatus !== "synced")
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));

  const completedMatches = (
    Array.isArray(serverMatches) ? serverMatches : []
  ).filter((match) => match.matchStatus === "COMPLETED");

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

  const isWinner = (teamName, match) => sameName(match.winner, teamName);
  const isDraw = (match) =>
    match.winner === "DRAW" ||
    match.resultType === "DRAW" ||
    match.result?.type === "DRAW";

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
      if (resultFilter === "DRAW") return isDraw(m);
      const won = isWinner(teamFilter, m);
      return resultFilter === "WON" ? won : !won && !isDraw(m);
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
              <option value="DRAW">Drawn</option>
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

          {pendingCompletedMatches.length > 0 && (
            <div style={{ ...list, marginBottom: 16 }}>
              {pendingCompletedMatches.map((match) => {
                const latestInnings = match.innings || [];
                const first = latestInnings[0];
                const second = latestInnings[1];
                return (
                  <div
                    key={`pending-${match.id}`}
                    style={{ ...completedCard, borderColor: "var(--color-amber-300)" }}
                    onClick={() => handleMatchClick(match, "LOCAL")}
                  >
                    <div style={{ ...cardHeader, marginBottom: 8 }}>
                      <strong>
                        {formatName(match.teams?.teamA?.name)} vs{" "}
                        {formatName(match.teams?.teamB?.name)}
                      </strong>
                      <span style={pendingSyncBadge}>
                        {match.syncStatus === "failed"
                          ? "Sync failed · retry"
                          : match.syncStatus === "pending"
                            ? "Pending sync"
                            : "Needs review"}
                      </span>
                    </div>
                    <div style={statusText}>
                      {first ? `${formatName(first.battingTeam)} ${getScoreLine(first)}` : ""}
                      {second ? ` · ${formatName(second.battingTeam)} ${getScoreLine(second)}` : ""}
                    </div>
                    {match.syncStatus === "failed" && (
                      <div style={syncErrorText}>Tap the sync badge in the header to retry.</div>
                    )}
                    {match.syncStatus !== "failed" && match.syncStatus !== "pending" && (
                      <div style={syncErrorText}>Open this match and tap Finish match when the score is confirmed.</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {serverLoading ? (
            <div style={emptyState}>
              <div style={spinner}></div>

              <p style={muted}>Loading completed matches...</p>
            </div>
          ) : filteredCompletedMatches.length === 0 && pendingCompletedMatches.length === 0 ? (
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
                return (
                  <div
                    key={match.id || match._id}
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
                            ? "var(--color-gray-900)"
                            : "var(--color-gray-500)",
                        }}
                      >
                        {formatName(match.teamA)}
                      </div>

                      <div
                        style={{
                          ...scoreText,

                          fontWeight: isWinner(match.teamA, match) ? 700 : 500,

                          color: isWinner(match.teamA, match)
                            ? "var(--color-gray-900)"
                            : "var(--color-gray-500)",
                        }}
                      >
                        {match.teamAScore != null
                          ? `${match.teamAScore}-${match.teamAWickets ?? 0} (${ballsToOvers(match.teamABallsFaced)})`
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
                            ? "var(--color-gray-900)"
                            : "var(--color-gray-500)",
                        }}
                      >
                        {formatName(match.teamB)}
                      </div>

                      <div
                        style={{
                          ...scoreText,

                          fontWeight: isWinner(match.teamB, match) ? 700 : 500,

                          color: isWinner(match.teamB, match)
                            ? "var(--color-gray-900)"
                            : "var(--color-gray-500)",
                        }}
                      >
                        {match.teamBScore != null
                          ? `${match.teamBScore}-${match.teamBWickets ?? 0} (${ballsToOvers(match.teamBBallsFaced)})`
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
  background: "var(--color-white)",
  borderRadius: 18,
  padding: 16,
  border: "1px solid var(--color-indigo-50)",
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
  borderTop: "1px solid var(--color-gray-100)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-indigo-700)",
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

  border: "3px solid var(--color-indigo-100)",

  borderTop: "3px solid var(--color-indigo-700)",

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
  color: "var(--color-gray-500)",
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
  border: "1px solid var(--color-gray-200)",
  background: "var(--color-white)",
  cursor: "pointer",
};

const activeTab = {
  ...tabBtn,
  background: "var(--color-indigo-600)",
  color: "var(--color-white)",
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
  border: "1px solid var(--color-gray-200)",
  background: "var(--color-white)",
  fontSize: 13,
  color: "var(--color-gray-700)",
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
  border: "1px solid var(--color-gray-200)",
  background: "var(--color-white)",
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
  color: "var(--color-gray-500)",
  marginTop: 4,
};

const pendingSyncBadge = {
  padding: "4px 8px",
  borderRadius: 999,
  background: "var(--color-amber-100)",
  color: "var(--color-amber-900)",
  fontSize: 10,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const syncErrorText = {
  marginTop: 8,
  fontSize: 11,
  color: "var(--color-amber-900)",
};

const muted = {
  color: "var(--color-gray-500)",
};
