import { useMemo, useState } from "react";
import { ShieldCheck, Trophy } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import MatchTypeTabs from "../components/stats/MatchTypeTabs";
import { LeaderboardState } from "../features/stats/components/LeaderboardView";
import { useTeamLeaderboard } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./TeamStats.module.css";

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export default function TeamStats() {
  const navigate = useNavigate();
  const { globalFilter = "all" } = useOutletContext() || {};
  const seasonId = globalFilter !== "all" ? globalFilter : undefined;
  const [matchType, setMatchType] = useState("OVERS");
  const query = useTeamLeaderboard({ seasonId, matchType });

  const standings = useMemo(
    () =>
      [...(query.data || [])].sort((a, b) => {
        const wins = number(b.matchesWon) - number(a.matchesWon);

        if (wins !== 0) return wins;

        return number(b.netRunRate) - number(a.netRunRate);
      }),
    [query.data],
  );

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.kicker}>
            <Trophy size={13} /> The board
          </span>
          <h2>Team standings</h2>
        </div>

        <span className={styles.headingIcon}>
          <ShieldCheck size={22} />
        </span>
      </header>

      <MatchTypeTabs value={matchType} onChange={setMatchType} />

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
            <span>NRR</span>
          </div>

          {standings.map((team, index) => (
            <button
              type="button"
              key={team.teamId ?? team.teamName}
              className={`${styles.grid} ${styles.row}`}
              onClick={() =>
                navigate(`/team/${encodeURIComponent(team.teamId)}`)
              }
            >
              <span className={styles.teamCell}>
                <span className={styles.rank}>{index + 1}</span>

                <span>
                  <strong>{formatName(team.teamName)}</strong>
                </span>
              </span>

              <span>{number(team.matchesPlayed)}</span>
              <strong>{number(team.matchesWon)}</strong>
              <span>{number(team.matchesLost)}</span>
              <span>{number(team.matchesTied)}</span>

              <span className={styles.winRate}>
                {number(team.netRunRate).toFixed(3)}
              </span>
            </button>
          ))}
        </div>
      </LeaderboardState>
    </div>
  );
}
