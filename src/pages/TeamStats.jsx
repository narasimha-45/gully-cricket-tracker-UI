import { useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { LeaderboardState } from "../features/stats/components/LeaderboardView";
import { useTeamLeaderboard } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./TeamStats.module.css";

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export default function TeamStats() {
  const navigate = useNavigate();
  const { globalFilter = "all" } = useOutletContext() || {};
  const query = useTeamLeaderboard({
    seasonId: globalFilter !== "all" ? globalFilter : undefined,
  });

  const standings = useMemo(
    () =>
      [...(query.data || [])].sort((a, b) => {
        const wins = number(b.matchesWon) - number(a.matchesWon);
        if (wins !== 0) return wins;
        return number(b.winPercentage) - number(a.winPercentage);
      }),
    [query.data],
  );

  return (
    <LeaderboardState
      loading={query.isLoading}
      fetching={query.isFetching && !query.isLoading}
      error={query.error}
      empty={standings.length === 0}
      onRetry={query.refetch}
      emptyTitle="No team standings"
      emptySubtitle="Complete matches to build the team table."
    >
      <div className={styles.table}>
        <div className={`${styles.grid} ${styles.header}`}>
          <span>Team</span>
          <span>P</span>
          <span>W</span>
          <span>L</span>
          <span>T</span>
          <span>Win%</span>
        </div>
        {standings.map((team, index) => (
          <button
            type="button"
            key={team.teamId ?? team.teamName}
            className={`${styles.grid} ${styles.row}`}
            onClick={() => navigate(`/team/${encodeURIComponent(team.teamId)}`)}
          >
            <span className={styles.teamCell}>
              <span className={styles.rank}>{index + 1}</span>
              <span>
                <strong>{formatName(team.teamName)}</strong>
                <small>
                  {number(team.timesWonChasing)} chase wins ·{" "}
                  {number(team.timesWonBattingFirst)} defend wins
                </small>
              </span>
            </span>
            <span>{number(team.matchesPlayed)}</span>
            <strong>{number(team.matchesWon)}</strong>
            <span>{number(team.matchesLost)}</span>
            <span>{number(team.matchesTied)}</span>
            <span className={styles.winRate}>
              {number(team.winPercentage).toFixed(1)}
            </span>
          </button>
        ))}
      </div>
    </LeaderboardState>
  );
}
