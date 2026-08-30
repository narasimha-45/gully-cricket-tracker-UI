import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Swords,
  Target,
  Trophy,
} from "lucide-react";
import LoadingState from "../components/common/LoadingState";
import MatchTypeTabs from "../components/stats/MatchTypeTabs";
import { LeaderboardState } from "../features/stats/components/LeaderboardView";
import { useSeasons, useTeamProfile } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./TeamProfile.module.css";

const n = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const d = (value, digits = 1) =>
  value === null || value === undefined ? "—" : n(value).toFixed(digits);
const pct = (part, total) => (total > 0 ? (n(part) / total) * 100 : 0);

const RESULT_TAG = { WIN: "W", LOSS: "L", TIE: "T", NO_RESULT: "NR" };

export default function TeamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seasonId, setSeasonId] = useState("");
  const [matchType, setMatchType] = useState("OVERS");
  const profileQuery = useTeamProfile(id, seasonId || undefined, matchType);
  const seasonsQuery = useSeasons();
  const profile = profileQuery.data;
  const seasonOptions = useMemo(
    () => seasonsQuery.data || [],
    [seasonsQuery.data],
  );

  const handleBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/");
  };

  if (profileQuery.isLoading && !profile)
    return <LoadingState label="Loading team profile…" />;

  const played = n(profile?.matchesPlayed);
  const runDiff = profile
    ? n(profile.totalRunsScored) - n(profile.totalRunsConceded)
    : 0;

  // Oldest → newest, left to right, so the strip reads like a timeline
  // ending in the team's most recent result on the right.
  const formGuide = (profile?.recentMatches || [])
    .slice(0, 8)
    .map((match) => ({
      matchId: match.matchId,
      tag: RESULT_TAG[match.result] || "NR",
      opponent: match.opponentTeamName,
    }))
    .reverse();

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
          {/* Header / crest */}
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
                <div className={styles.crest} aria-hidden="true">
                  <span>
                    {(profile.teamName || "T").slice(0, 1).toUpperCase()}
                  </span>
                </div>
                <div className={styles.titleWrap}>
                  <p className={styles.eyebrow}>
                    <Swords size={12} /> Team profile
                  </p>
                  <h1 className={styles.title}>
                    {formatName(profile.teamName)}
                  </h1>
                  <p className={styles.subtitle}>
                    {seasonId ? "Season view" : "All-time record"}
                  </p>
                </div>
              </div>
              <SeasonSelect
                seasons={seasonOptions}
                value={seasonId}
                onChange={setSeasonId}
              />
            </div>

            {formGuide.length > 0 && (
              <div
                className={styles.formGuide}
                aria-label="Recent form, oldest to newest"
              >
                {formGuide.map((match) => (
                  <span
                    key={match.matchId}
                    className={`${styles.formChip} ${styles[`formChip${match.tag}`]}`}
                    title={`${match.tag} vs ${formatName(match.opponent)}`}
                  >
                    {match.tag}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.scoreRail}>
              <ScoreItem label="Played" value={played} />
              <div className={styles.scoreDivider} />
              <ScoreItem
                label="Won"
                value={n(profile.matchesWon)}
                accent="win"
              />
              <div className={styles.scoreDivider} />
              <ScoreItem
                label="Lost"
                value={n(profile.matchesLost)}
                accent="loss"
              />
              <div className={styles.scoreDivider} />
              <ScoreItem
                label="Win rate"
                value={`${d(profile.winPercentage)}%`}
              />
            </div>

            <div className={styles.recordBarWrap}>
              <div className={styles.recordBar}>
                <div
                  className={styles.recordSegWin}
                  style={{ width: `${pct(profile.matchesWon, played)}%` }}
                />
                <div
                  className={styles.recordSegLoss}
                  style={{ width: `${pct(profile.matchesLost, played)}%` }}
                />
                {n(profile.matchesTied) > 0 && (
                  <div
                    className={styles.recordSegTie}
                    style={{ width: `${pct(profile.matchesTied, played)}%` }}
                  />
                )}
                {n(profile.matchesNoResult) > 0 && (
                  <div
                    className={styles.recordSegNr}
                    style={{
                      width: `${pct(profile.matchesNoResult, played)}%`,
                    }}
                  />
                )}
              </div>
              <div className={styles.recordLegend}>
                <span>
                  <i className={styles.dotWin} />
                  {profile.matchesWon}W
                </span>
                <span>
                  <i className={styles.dotLoss} />
                  {profile.matchesLost}L
                </span>
                {n(profile.matchesTied) > 0 && (
                  <span>
                    <i className={styles.dotTie} />
                    {profile.matchesTied}T
                  </span>
                )}
                {n(profile.matchesNoResult) > 0 && (
                  <span>
                    <i className={styles.dotNr} />
                    {profile.matchesNoResult}NR
                  </span>
                )}
              </div>
            </div>
          </section>

          <MatchTypeTabs value={matchType} onChange={setMatchType} />

          {/* Match approach */}
          <section className={styles.section}>
            <SectionHeader title="Match approach" icon={Target} />
            <ApproachPanel profile={profile} />
          </section>

          {/* Scoring */}
          <section className={styles.section}>
            <SectionHeader title="Scoring" icon={BarChart3} />
            <div className={styles.scoreCompareTop}>
              <span>{n(profile.totalRunsScored)} scored</span>
              <span>{n(profile.totalRunsConceded)} conceded</span>
            </div>
            <div className={styles.scoreCompareBar}>
              <div
                className={styles.scoreFillFor}
                style={{
                  width: `${pct(profile.totalRunsScored, n(profile.totalRunsScored) + n(profile.totalRunsConceded))}%`,
                }}
              />
              <div
                className={styles.scoreFillAgainst}
                style={{
                  width: `${pct(profile.totalRunsConceded, n(profile.totalRunsScored) + n(profile.totalRunsConceded))}%`,
                }}
              />
            </div>
            <div className={styles.scoreCaption}>
              <span
                className={
                  runDiff >= 0 ? styles.diffPositive : styles.diffNegative
                }
              >
                {runDiff >= 0 ? "+" : ""}
                {runDiff} net runs
              </span>
              <span className={styles.scoreCaptionMuted}>
                {d(profile.averageScore)} avg score
                {n(profile.matchesTied) > 0 && ` · ${profile.matchesTied} tied`}
                {n(profile.matchesNoResult) > 0 &&
                  ` · ${profile.matchesNoResult} no result`}
              </span>
            </div>
          </section>

          {/* Records */}
          <section className={styles.section}>
            <SectionHeader title="Records" icon={Award} />
            <div className={styles.recordStrip}>
              <RecordChip
                label="Highest score"
                match={profile.highestTeamScore}
                accent="win"
              />
              <RecordChip
                label="Lowest score"
                match={profile.lowestTeamScore}
                accent="loss"
              />
              <RecordChip
                label="Lowest defended"
                match={profile.lowestTotalDefended}
                accent="indigo"
              />
              <RecordChip
                label="Highest chased"
                match={profile.highestTotalChased}
                accent="amber"
              />
            </div>
          </section>

          {/* Recent matches */}
          <section className={styles.section}>
            <SectionHeader title="Recent matches" icon={Trophy} />
            {(profile.recentMatches || []).length === 0 ? (
              <div className={styles.empty}>No recent matches available.</div>
            ) : (
              <div className={styles.list}>
                {profile.recentMatches.slice(0, 5).map((match) => (
                  <TeamMatchRow key={match.matchId} match={match} />
                ))}
              </div>
            )}
          </section>

          {/* Season history */}
          {!seasonId && (profile.bySeason || []).length > 0 && (
            <section className={styles.section}>
              <SectionHeader title="Season history" icon={CalendarDays} />
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

function ScoreItem({ label, value, accent }) {
  return (
    <div className={styles.scoreItem}>
      <strong
        className={
          accent
            ? styles[`scoreValue${accent === "win" ? "Win" : "Loss"}`]
            : undefined
        }
      >
        {value}
      </strong>
      <span>{label}</span>
    </div>
  );
}

function ApproachPanel({ profile }) {
  const batWin = n(profile.winPercentageBattingFirst);
  const chaseWin = n(profile.winPercentageChasing);
  const batBetter = batWin > chaseWin;
  const chaseBetter = chaseWin > batWin;

  return (
    <div className={styles.approachPanel}>
      <div className={styles.approachSide}>
        <span
          className={`${styles.approachPct} ${batBetter ? styles.approachLead : ""}`}
        >
          {d(batWin)}%
        </span>
        <span className={styles.approachLabel}>Batting first</span>
        <span className={styles.approachSub}>
          {n(profile.timesWonBattingFirst)}/{n(profile.timesBattedFirst)} won
        </span>
      </div>
      <div className={styles.approachVs}>vs</div>
      <div className={styles.approachSide}>
        <span
          className={`${styles.approachPct} ${chaseBetter ? styles.approachLead : ""}`}
        >
          {d(chaseWin)}%
        </span>
        <span className={styles.approachLabel}>Chasing</span>
        <span className={styles.approachSub}>
          {n(profile.timesWonChasing)}/{n(profile.timesBattedSecond)} won
        </span>
      </div>
    </div>
  );
}

function RecordChip({ label, match, accent }) {
  const accentClass = {
    win: styles.recordChipWin,
    loss: styles.recordChipLoss,
    indigo: styles.recordChipIndigo,
    amber: styles.recordChipAmber,
  }[accent];

  if (!match) {
    return (
      <div className={`${styles.recordChip} ${accentClass}`}>
        <span className={styles.recordChipLabel}>{label}</span>
        <span className={styles.recordChipEmpty}>No data yet</span>
      </div>
    );
  }

  return (
    <div className={`${styles.recordChip} ${accentClass}`}>
      <span className={styles.recordChipLabel}>{label}</span>
      <strong className={styles.recordChipScore}>
        {n(match.teamScore)}/{n(match.teamWickets)}
      </strong>
      <span className={styles.recordChipMeta}>
        vs {formatName(match.opponentTeamName)}
      </span>
    </div>
  );
}

function TeamMatchRow({ match }) {
  const tag = RESULT_TAG[match.result] || "NR";
  const badgeClass =
    tag === "W"
      ? styles.matchBadgeWin
      : tag === "L"
        ? styles.matchBadgeLoss
        : styles.matchBadgeNeutral;
  const diff = n(match.teamScore) - n(match.opponentScore);

  return (
    <div className={styles.matchRow}>
      <div className={styles.matchRowTop}>
        <span className={styles.matchLeft}>
          <span className={`${styles.matchBadge} ${badgeClass}`}>{tag}</span>
          <strong className={styles.matchOpponent}>
            vs {formatName(match.opponentTeamName)}
          </strong>
        </span>
        <span className={styles.matchDate}>
          {match.battingFirst ? "Bat 1st" : "Chase"}
        </span>
      </div>
      <div className={styles.matchDetail}>
        {n(match.teamScore)}/{n(match.teamWickets)} · {n(match.opponentScore)}/
        {n(match.opponentWickets)}{" "}
        <span className={diff >= 0 ? styles.diffPositive : styles.diffNegative}>
          {diff >= 0 ? "+" : ""}
          {diff}
        </span>
      </div>
    </div>
  );
}

function SeasonSelect({ seasons, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target))
        setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const activeLabel = value
    ? seasons.find((s) => s.id === value)?.seasonName || "Season"
    : "All seasons";
  const handlePick = (seasonId) => {
    onChange(seasonId);
    setOpen(false);
  };

  return (
    <div className={styles.seasonPicker} ref={rootRef}>
      <button
        type="button"
        className={styles.select}
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.selectLabel}>{activeLabel}</span>
        <ChevronDown size={13} className={styles.selectChevron} />
      </button>
      {open && (
        <ul className={styles.seasonMenu} role="listbox">
          <li
            role="option"
            aria-selected={!value}
            className={`${styles.seasonOption} ${!value ? styles.seasonOptionActive : ""}`}
            onClick={() => handlePick("")}
          >
            All seasons
          </li>
          {seasons.map((season) => (
            <li
              key={season.id}
              role="option"
              aria-selected={value === season.id}
              className={`${styles.seasonOption} ${value === season.id ? styles.seasonOptionActive : ""}`}
              onClick={() => handlePick(season.id)}
            >
              {season.seasonName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
