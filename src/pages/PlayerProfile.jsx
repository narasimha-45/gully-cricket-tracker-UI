import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import LoadingState from "../components/common/LoadingState";
import { LeaderboardState } from "../features/stats/components/LeaderboardView";
import { usePlayerProfile, useSeasons } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./Profile.module.css";

const n = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const d = (value, digits = 1) =>
  value === null || value === undefined ? "—" : n(value).toFixed(digits);

export default function PlayerProfile() {
  const { id } = useParams();
  const [seasonId, setSeasonId] = useState("");
  const profileQuery = usePlayerProfile(id, seasonId || undefined);
  const seasonsQuery = useSeasons();
  const profile = profileQuery.data;

  const seasonOptions = useMemo(
    () => seasonsQuery.data || [],
    [seasonsQuery.data],
  );

  if (profileQuery.isLoading && !profile)
    return <LoadingState label="Loading player profile…" />;

  return (
    <LeaderboardState
      loading={profileQuery.isLoading}
      fetching={profileQuery.isFetching && !profileQuery.isLoading}
      error={profileQuery.error}
      empty={!profile}
      onRetry={profileQuery.refetch}
      emptyTitle="Player not found"
      emptySubtitle="The player may not have completed-match statistics yet."
    >
      {profile && (
        <div className={styles.page}>
          <section className={styles.headerCard}>
            <div className={styles.headerTop}>
              <div className={styles.identity}>
                <div className={styles.avatar}>
                  {(profile.playerName || "P").slice(0, 1).toUpperCase()}
                </div>
                <div className={styles.titleWrap}>
                  <p className={styles.eyebrow}>Player profile</p>
                  <h1 className={styles.title}>
                    {formatName(profile.playerName)}
                  </h1>
                  <p className={styles.subtitle}>
                    {seasonId ? "Season view" : "Career view"}
                  </p>
                </div>
              </div>
              <select
                className={styles.select}
                value={seasonId}
                onChange={(event) => setSeasonId(event.target.value)}
                aria-label="Filter player profile by season"
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
              <HeroStat label="Matches" value={n(profile.totalMatchesPlayed)} />
              <HeroStat label="Wins" value={n(profile.totalMatchesWon)} />
              <HeroStat
                label="Win rate"
                value={`${d(profile.winPercentage)}%`}
              />
              <HeroStat
                label="MOTM"
                value={n(profile.playerOfTheMatchAwards)}
              />
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader title="Batting" subtitle="Completed matches" />
            <div className={styles.statGrid}>
              <StatTile
                label="Runs"
                value={n(profile.overallBatting?.totalRuns)}
              />
              <StatTile
                label="Average"
                value={d(profile.overallBatting?.average, 2)}
              />
              <StatTile
                label="Strike rate"
                value={d(profile.overallBatting?.strikeRate, 2)}
              />
              <StatTile
                label="Highest"
                value={n(profile.overallBatting?.highestScore)}
              />
              <StatTile
                label="4s / 6s"
                value={`${n(profile.overallBatting?.totalFours)} / ${n(profile.overallBatting?.totalSixes)}`}
              />
              <StatTile
                label="Not outs"
                value={n(profile.overallBatting?.notOuts)}
              />
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader title="Bowling" subtitle="Completed matches" />
            <div className={styles.statGrid}>
              <StatTile
                label="Wickets"
                value={n(profile.overallBowling?.totalWickets)}
              />
              <StatTile
                label="Economy"
                value={d(profile.overallBowling?.economyRate, 2)}
              />
              <StatTile
                label="Average"
                value={
                  n(profile.overallBowling?.totalWickets) === 0
                    ? "—"
                    : d(profile.overallBowling?.average, 2)
                }
              />
              <StatTile
                label="Overs"
                value={profile.overallBowling?.totalOversBowled ?? "0.0"}
              />
              <StatTile
                label="Maidens"
                value={n(profile.overallBowling?.totalMaidens)}
              />
              <StatTile
                label="5W / 10W"
                value={`${n(profile.overallBowling?.fiveWicketHauls)} / ${n(profile.overallBowling?.tenWicketHauls)}`}
              />
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader title="Fielding" subtitle="Career impact" />
            <div className={styles.statGrid}>
              <StatTile
                label="Catches"
                value={n(profile.overallFielding?.totalCatches)}
              />
              <StatTile
                label="Run outs"
                value={n(profile.overallFielding?.totalRunOuts)}
              />
              <StatTile
                label="Stumpings"
                value={n(profile.overallFielding?.totalStumpings)}
              />
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader title="Recent form" subtitle="Latest innings" />
            {(profile.recentForm || []).length === 0 ? (
              <div className={styles.empty}>No recent innings available.</div>
            ) : (
              <div className={styles.list}>
                {(profile.recentForm || []).map((inning) => (
                  <div
                    key={`${inning.matchId}-${inning.completedAt}`}
                    className={styles.listRow}
                  >
                    <strong>vs {formatName(inning.opponentTeamName)}</strong>
                    <span>{n(inning.runsScored)} runs</span>
                    <span>{n(inning.ballsFaced)} balls</span>
                    <span>Pos {n(inning.battingPosition)}</span>
                    <span>{inning.matchWon ? "Won" : "Lost"}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <SectionHeader
              title="By batting position"
              subtitle="Role performance"
            />
            {(profile.byBattingPosition || []).length === 0 ? (
              <div className={styles.empty}>No position splits available.</div>
            ) : (
              <div className={styles.list}>
                {(profile.byBattingPosition || []).map((row) => (
                  <div key={row.battingPosition} className={styles.listRow}>
                    <strong>Position {row.battingPosition}</strong>
                    <span>{n(row.totalRuns)} runs</span>
                    <span>{n(row.innings)} inn</span>
                    <span>{d(row.average)} avg</span>
                    <span>{d(row.strikeRate)} SR</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {!seasonId && (profile.bySeason || []).length > 0 && (
            <section className={styles.section}>
              <SectionHeader
                title="Season history"
                subtitle="Career progression"
              />
              <div className={styles.list}>
                {profile.bySeason.map((row) => (
                  <div key={row.seasonId} className={styles.listRow}>
                    <strong>{row.seasonName}</strong>
                    <span>{n(row.totalRuns)} runs</span>
                    <span>{n(row.totalWickets)} wkts</span>
                    <span>{d(row.battingAverage)} bat avg</span>
                    <span>{d(row.economyRate)} econ</span>
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
