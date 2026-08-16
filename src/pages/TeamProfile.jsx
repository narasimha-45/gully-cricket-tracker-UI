import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import LoadingState from "../components/common/LoadingState";
import { LeaderboardState } from "../features/stats/components/LeaderboardView";
import { useSeasons, useTeamProfile } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./Profile.module.css";

const n = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const d = (value, digits = 1) =>
  value === null || value === undefined ? "—" : n(value).toFixed(digits);

export default function TeamProfile() {
  const { id } = useParams();
  const [seasonId, setSeasonId] = useState("");
  const profileQuery = useTeamProfile(id, seasonId || undefined);
  const seasonsQuery = useSeasons();
  const profile = profileQuery.data;
  const seasonOptions = useMemo(
    () => seasonsQuery.data || [],
    [seasonsQuery.data],
  );

  if (profileQuery.isLoading && !profile)
    return <LoadingState label="Loading team profile…" />;

  return (
    <LeaderboardState
      loading={profileQuery.isLoading}
      fetching={profileQuery.isFetching && !profileQuery.isLoading}
      error={profileQuery.error}
      empty={!profile}
      onRetry={profileQuery.refetch}
      emptyTitle="Team not found"
      emptySubtitle="The team may not have completed-match statistics yet."
    >
      {profile && (
        <div className={styles.page}>
          <section className={styles.headerCard}>
            <div className={styles.headerTop}>
              <div className={styles.identity}>
                <div className={styles.avatar}>
                  {(profile.teamName || "T").slice(0, 1).toUpperCase()}
                </div>
                <div className={styles.titleWrap}>
                  <p className={styles.eyebrow}>Team profile</p>
                  <h1 className={styles.title}>
                    {formatName(profile.teamName)}
                  </h1>
                  <p className={styles.subtitle}>
                    {seasonId ? "Season view" : "All-time view"}
                  </p>
                </div>
              </div>
              <select
                className={styles.select}
                value={seasonId}
                onChange={(event) => setSeasonId(event.target.value)}
                aria-label="Filter team profile by season"
              >
                <option value="">All seasons</option>
                {seasonOptions.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.seasonName}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.heroStats}>
              <HeroStat label="Played" value={n(profile.matchesPlayed)} />
              <HeroStat label="Won" value={n(profile.matchesWon)} />
              <HeroStat label="Lost" value={n(profile.matchesLost)} />
              <HeroStat
                label="Win rate"
                value={`${d(profile.winPercentage)}%`}
              />
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader
              title="Match approach"
              subtitle="Bat first vs chase"
            />
            <div className={styles.statGrid}>
              <StatTile
                label="Batted first"
                value={n(profile.timesBattedFirst)}
              />
              <StatTile
                label="Wins batting first"
                value={n(profile.timesWonBattingFirst)}
              />
              <StatTile
                label="Win % batting first"
                value={`${d(profile.winPercentageBattingFirst)}%`}
              />
              <StatTile label="Chases" value={n(profile.timesBattedSecond)} />
              <StatTile label="Chase wins" value={n(profile.timesWonChasing)} />
              <StatTile
                label="Chase win %"
                value={`${d(profile.winPercentageChasing)}%`}
              />
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader title="Scoring" subtitle="Team output" />
            <div className={styles.statGrid}>
              <StatTile
                label="Runs scored"
                value={n(profile.totalRunsScored)}
              />
              <StatTile
                label="Runs conceded"
                value={n(profile.totalRunsConceded)}
              />
              <StatTile label="Average score" value={d(profile.averageScore)} />
              <StatTile label="Ties" value={n(profile.matchesTied)} />
              <StatTile label="No results" value={n(profile.matchesNoResult)} />
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader
              title="Records"
              subtitle="Notable completed matches"
            />
            <div className={styles.list}>
              <Notable label="Highest score" match={profile.highestTeamScore} />
              <Notable label="Lowest score" match={profile.lowestTeamScore} />
              <Notable
                label="Lowest defended"
                match={profile.lowestTotalDefended}
              />
              <Notable
                label="Highest chased"
                match={profile.highestTotalChased}
              />
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader title="Recent matches" subtitle="Latest results" />
            {(profile.recentMatches || []).length === 0 ? (
              <div className={styles.empty}>No recent matches available.</div>
            ) : (
              <div className={styles.list}>
                {profile.recentMatches.map((match) => (
                  <div key={match.matchId} className={styles.listRow}>
                    <strong>vs {formatName(match.opponentTeamName)}</strong>
                    <span>
                      {n(match.teamScore)}/{n(match.teamWickets)}
                    </span>
                    <span>
                      {n(match.opponentScore)}/{n(match.opponentWickets)}
                    </span>
                    <span>{match.result || "—"}</span>
                    <span>{match.battingFirst ? "Bat 1st" : "Chase"}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {!seasonId && (profile.bySeason || []).length > 0 && (
            <section className={styles.section}>
              <SectionHeader
                title="Season history"
                subtitle="Team progression"
              />
              <div className={styles.list}>
                {profile.bySeason.map((row) => (
                  <div key={row.seasonId} className={styles.listRow}>
                    <strong>{row.seasonName}</strong>
                    <span>{n(row.matchesPlayed)} P</span>
                    <span>{n(row.matchesWon)} W</span>
                    <span>{d(row.winPercentage)}%</span>
                    <span>{n(row.totalRunsScored)} runs</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </LeaderboardState>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className={styles.sectionHeader}>
      <h2>{title}</h2>
      <span>{subtitle}</span>
    </div>
  );
}
function HeroStat({ label, value }) {
  return (
    <div className={styles.heroStat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function StatTile({ label, value }) {
  return (
    <div className={styles.statTile}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function Notable({ label, match }) {
  if (!match)
    return (
      <div className={styles.notable}>
        <strong>{label}</strong>
        <span>—</span>
        <span>—</span>
        <span>—</span>
      </div>
    );
  return (
    <div className={styles.notable}>
      <strong>{label}</strong>
      <span>
        {n(match.teamScore)}/{n(match.teamWickets)}
      </span>
      <span>vs {formatName(match.opponentTeamName)}</span>
      <span>{match.result || "—"}</span>
    </div>
  );
}
