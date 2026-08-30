import { useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  Percent,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  ArrowLeft,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import LoadingState from "../components/common/LoadingState";
import MatchTypeTabs from "../components/stats/MatchTypeTabs";
import { LeaderboardState } from "../features/stats/components/LeaderboardView";
import { usePlayerProfile, useSeasons } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./Profile.module.css";

const n = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const d = (value, digits = 1) =>
  value === null || value === undefined ? "—" : n(value).toFixed(digits);

const formatDate = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

// Proportional width for a single bar (0–100), guarding against div-by-zero.
const widthPct = (value, max) => {
  const safeMax = Math.max(n(max), 0.0001);
  return Math.min(100, Math.max(0, (n(value) / safeMax) * 100));
};

// Tug-of-war split for two-sided comparisons; both zero renders as an even 50/50.
const tugPct = (a, b) => {
  const total = n(a) + n(b);
  if (total <= 0) return 50;
  return (n(a) / total) * 100;
};

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };
  const [seasonId, setSeasonId] = useState("");
  const [matchType, setMatchType] = useState("OVERS");
  const profileQuery = usePlayerProfile(id, seasonId || undefined, matchType);
  const seasonsQuery = useSeasons();
  const profile = profileQuery.data;

  const seasonOptions = useMemo(
    () => seasonsQuery.data || [],
    [seasonsQuery.data],
  );

  const recentPerformances =
    profile?.recentPerformances || profile?.recentForm || [];
  const maxPositionRuns = useMemo(
    () =>
      Math.max(
        1,
        ...(profile?.byBattingPosition || []).map((row) => n(row.totalRuns)),
      ),
    [profile],
  );
  const maxTeamMatches = useMemo(
    () =>
      Math.max(
        1,
        ...(profile?.byTeam || []).map((row) => n(row.matchesPlayed)),
      ),
    [profile],
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
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBack}
                aria-label="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <div className={styles.identity}>
                <div className={styles.avatar}>
                  {(profile.playerName || "P").slice(0, 1).toUpperCase()}
                </div>
                <div className={styles.titleWrap}>
                  <p className={styles.eyebrow}>
                    <Sparkles size={12} /> Player profile
                  </p>
                  <h1 className={styles.title}>
                    {formatName(profile.playerName)}
                  </h1>
                  <p className={styles.subtitle}>
                    {seasonId ? "Season view" : "Career record"}
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
              <HeroStat
                icon={Swords}
                label="Matches"
                value={n(profile.totalMatchesPlayed)}
              />
              <HeroStat
                icon={Trophy}
                label="Wins"
                value={n(profile.totalMatchesWon)}
              />
              <HeroStat
                icon={Percent}
                label="Win rate"
                value={`${d(profile.winPercentage)}%`}
              />
              <HeroStat
                icon={Award}
                label="Awards"
                value={n(profile.playerOfTheMatchAwards)}
              />
            </div>
          </section>

          <MatchTypeTabs value={matchType} onChange={setMatchType} />

          <section className={styles.section}>
            <SectionHeader title="Batting" icon={BarChart3} />
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
                label="Best score"
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
            <SectionHeader title="Bowling" icon={Shield} />
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
            {profile.overallBowling?.bestBowlingFigures?.wickets > 0 && (
              <div className={styles.bestFigures}>
                <strong>
                  {profile.overallBowling.bestBowlingFigures.wickets}/
                  {profile.overallBowling.bestBowlingFigures.runsConceded}
                </strong>
                <span>
                  best figures ·{" "}
                  {profile.overallBowling.bestBowlingFigures.ballsBowled} balls
                </span>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <SectionHeader title="Fielding" icon={Users} />
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

          {(profile.byMatchResult?.length > 0 ||
            profile.byInnings?.length > 0) && (
            <section className={styles.section}>
              <SectionHeader title="Match situations" icon={BarChart3} />
              {profile.byMatchResult?.length === 2 && (
                <SplitCompare
                  labelA={profile.byMatchResult[0].splitLabel}
                  labelB={profile.byMatchResult[1].splitLabel}
                  toneA="win"
                  toneB="loss"
                  rows={[
                    {
                      label: "Bat avg",
                      a: profile.byMatchResult[0].battingAverage,
                      b: profile.byMatchResult[1].battingAverage,
                      digits: 2,
                    },
                    {
                      label: "Strike rate",
                      a: profile.byMatchResult[0].strikeRate,
                      b: profile.byMatchResult[1].strikeRate,
                      digits: 2,
                    },
                    {
                      label: "Economy",
                      a: profile.byMatchResult[0].economyRate,
                      b: profile.byMatchResult[1].economyRate,
                      digits: 2,
                    },
                  ]}
                />
              )}
              {profile.byInnings?.length === 2 && (
                <SplitCompare
                  labelA={profile.byInnings[0].splitLabel}
                  labelB={profile.byInnings[1].splitLabel}
                  toneA="neutral"
                  toneB="neutral"
                  rows={[
                    {
                      label: "Runs",
                      a: profile.byInnings[0].totalRuns,
                      b: profile.byInnings[1].totalRuns,
                      digits: 0,
                    },
                    {
                      label: "Strike rate",
                      a: profile.byInnings[0].strikeRate,
                      b: profile.byInnings[1].strikeRate,
                      digits: 2,
                    },
                    {
                      label: "Wickets",
                      a: profile.byInnings[0].totalWickets,
                      b: profile.byInnings[1].totalWickets,
                      digits: 0,
                    },
                  ]}
                />
              )}
            </section>
          )}

          <section className={styles.section}>
            <SectionHeader title="Batting position" icon={BarChart3} />
            {(profile.byBattingPosition || []).length === 0 ? (
              <div className={styles.empty}>No position splits available.</div>
            ) : (
              <div className={styles.list}>
                {profile.byBattingPosition.map((row) => (
                  <div key={row.battingPosition} className={styles.positionRow}>
                    <span className={styles.positionBadge}>
                      {row.battingPosition}
                    </span>
                    <div className={styles.positionMain}>
                      <div className={styles.positionBarTrack}>
                        <div
                          className={styles.positionBarFill}
                          style={{
                            width: `${widthPct(row.totalRuns, maxPositionRuns)}%`,
                          }}
                        />
                      </div>
                      <div className={styles.positionCaption}>
                        {d(row.average)} avg · {d(row.strikeRate)} SR ·{" "}
                        {n(row.innings)} inn
                      </div>
                    </div>
                    <div className={styles.positionRuns}>
                      <strong>{n(row.totalRuns)}</strong>
                      <span>runs</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <SectionHeader title="Recent matches" icon={Trophy} />
            {recentPerformances.length === 0 ? (
              <div className={styles.empty}>No recent innings available.</div>
            ) : (
              <div className={styles.list}>
                {recentPerformances.map((match) => (
                  <MatchRow
                    key={`${match.matchId}-${match.completedAt}`}
                    match={match}
                  />
                ))}
              </div>
            )}
          </section>

          {(profile.byTeam || []).length > 0 && (
            <section className={styles.section}>
              <SectionHeader title="By team" icon={Shield} />
              <div className={styles.list}>
                {profile.byTeam.map((row) => (
                  <div key={row.teamId} className={styles.teamRow}>
                    <div className={styles.teamRowTop}>
                      <strong>{formatName(row.teamName)}</strong>
                      <span>
                        {n(row.matchesPlayed)} matches · {d(row.winPercentage)}%
                        won
                      </span>
                    </div>
                    <div className={styles.positionBarTrack}>
                      <div
                        className={styles.teamBarFill}
                        style={{
                          width: `${widthPct(row.matchesPlayed, maxTeamMatches)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!seasonId && (profile.bySeason || []).length > 0 && (
            <section className={styles.section}>
              <SectionHeader title="Season history" icon={Award} />
              <div className={styles.list}>
                {profile.bySeason.map((row) => (
                  <div key={row.seasonId} className={styles.listRow}>
                    <strong>{row.seasonName}</strong>
                    <span>{n(row.totalRuns)} runs</span>
                    <span>{n(row.totalWickets)} wkts</span>
                    <span>{d(row.battingAverage)} bat avg</span>
                    <span>{d(row.economyRate)} econ</span>
                    {(n(row.fifties) > 0 ||
                      n(row.hundreds) > 0 ||
                      n(row.manOfTheMatchAwards) > 0) && (
                      <span className={styles.seasonBadges}>
                        {n(row.hundreds) > 0 && `${row.hundreds} 100s `}
                        {n(row.fifties) > 0 && `${row.fifties} 50s `}
                        {n(row.manOfTheMatchAwards) > 0 &&
                          `${row.manOfTheMatchAwards} MOTM`}
                      </span>
                    )}
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

function SectionHeader({ title, icon: Icon }) {
  return (
    <div className={styles.sectionHeader}>
      <h2>
        {Icon && <Icon size={15} />}
        {title}
      </h2>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value }) {
  return (
    <div className={styles.heroStat}>
      {Icon && <Icon size={13} className={styles.heroIcon} />}
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

function SplitCompare({ labelA, labelB, toneA, toneB, rows }) {
  return (
    <div className={styles.compareBlock}>
      <div className={styles.compareLabels}>
        <span className={styles[`tone_${toneA}`] || ""}>
          {formatName(labelA)}
        </span>
        <span className={styles[`tone_${toneB}`] || ""}>
          {formatName(labelB)}
        </span>
      </div>
      {rows.map((row) => {
        const leftPct = tugPct(row.a, row.b);
        return (
          <div key={row.label} className={styles.compareRow}>
            <span className={styles.compareValue}>{d(row.a, row.digits)}</span>
            <div className={styles.compareTrack}>
              <div
                className={styles.compareFillA}
                style={{ width: `${leftPct}%` }}
              />
              <div
                className={styles.compareFillB}
                style={{ width: `${100 - leftPct}%` }}
              />
            </div>
            <span className={styles.compareValue}>{d(row.b, row.digits)}</span>
            <span className={styles.compareRowLabel}>{row.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function MatchRow({ match }) {
  const battingInnings = match.batting || [];
  const bowlingSpells = match.bowling || [];

  const battingSummary = battingInnings
    .map(
      (inn) => `${inn.runsScored}${!inn.out ? "*" : ""} (${inn.ballsFaced}b)`,
    )
    .join(", ");
  const bowlingSummary = bowlingSpells
    .map(
      (spell) =>
        `${spell.wicketsTaken}/${spell.runsConceded} (${spell.oversBowled}ov)`,
    )
    .join(", ");
  const fieldingSummary = [
    n(match.catches) > 0 && `${match.catches}ct`,
    n(match.runOuts) > 0 && `${match.runOuts}ro`,
    n(match.stumpings) > 0 && `${match.stumpings}st`,
  ]
    .filter(Boolean)
    .join(" ");

  const detailLine =
    [battingSummary, bowlingSummary, fieldingSummary]
      .filter(Boolean)
      .join(" · ") || "Did not bat or bowl";

  return (
    <div className={styles.matchRow}>
      <div className={styles.matchRowTop}>
        <span className={styles.matchLeft}>
          <span
            className={`${styles.matchBadge} ${match.matchWon ? styles.matchBadgeWin : styles.matchBadgeLoss}`}
          >
            {match.matchWon ? "W" : "L"}
          </span>
          <strong className={styles.matchOpponent}>
            vs {formatName(match.opponentTeamName)}
          </strong>
        </span>
        <span className={styles.matchDate}>
          {formatDate(match.completedAt)}
        </span>
      </div>
      <div className={styles.matchDetail}>
        {detailLine}{" "}
        <span className={styles.matchSeasonTag}>
          · {formatName(match.seasonName)}
        </span>
      </div>
    </div>
  );
}
