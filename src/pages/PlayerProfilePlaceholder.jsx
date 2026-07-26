import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, unwrapApiData } from "../api";

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("overall");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeasons();
  }, []);
  useEffect(() => {
    loadProfile();
  }, [id, selectedSeason]);

  const loadSeasons = async () => {
    try {
      const response = await api.seasons.getAllSeasons();
      const seasonList = unwrapApiData(response);
      setSeasons(Array.isArray(seasonList) ? seasonList : []);
    } catch (err) {
      console.error("Failed to load seasons", err);
      setSeasons([]);
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = selectedSeason === "overall"
        ? await api.stats.getPlayerProfile(id)
        : await api.stats.getPlayerProfileBySeason(id, selectedSeason);
      setProfile(unwrapApiData(response) || null);
    } catch (err) {
      console.error("Failed to load player profile", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile)
    return (
      <div style={S.center}>
        <div style={S.spinner} />
        <div
          style={{
            marginTop: 16,
            color: "var(--color-slate-500)",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          Loading player data...
        </div>
      </div>
    );

  if (!profile)
    return (
      <div style={{ ...S.center, flexDirection: "column", padding: 20 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>👤</div>
        <h2 style={{ margin: "0 0 8px", color: "var(--color-slate-900)" }}>
          Player not found
        </h2>
        <p
          style={{
            margin: "0 0 24px",
            color: "var(--color-slate-500)",
            maxWidth: 280,
            lineHeight: 1.5,
            textAlign: "center",
          }}
        >
          We couldn't find a player with the ID "{id}".
        </p>
        <button onClick={() => navigate("/")} style={S.homeBtn}>
          Go to Home
        </button>
      </div>
    );

  const p = profile.profile || { name: id };
  const stats = profile.career || profile.stats || {};
  const derived = profile.derived || {};
  const batting = stats.batting || {};
  const bowling = stats.bowling || {};
  const fielding = stats.fielding || { catches: 0, runOuts: 0, stumpings: 0 };
  const achievements = stats.achievements || { mom: 0 };

  const wins = stats.wins || 0;
  const losses = stats.losses || 0;
  const totalMatch = stats.totalMatches || p.totalMatches || 0;
  const winPct = totalMatch > 0 ? Math.round((wins / totalMatch) * 100) : 0;

  const teamNames = (p.teamsPlayedFor || [])
    .map((t) => (typeof t === "object" ? t.name : t))
    .filter(Boolean);
  const seasonCount = (p.seasonsPlayed || []).length;

  const dismissedByList = batting.mostDismissedBy || [];
  const dismissedBattersList = bowling.mostDismissedBatters || [];

  const dismissalEntries = Object.entries(batting.dismissalTypes || {})
    .filter(([k, v]) => k !== "notOut" && v > 0)
    .sort(([, a], [, b]) => b - a);
  const maxDismissal = dismissalEntries[0]?.[1] || 1;

  const scoreBuckets = batting.scoreBuckets || [];
  const bucketLabels = [
    "0-9",
    "10-19",
    "20-29",
    "30-39",
    "40-49",
    "50-59",
    "60-69",
    "70-79",
    "80+",
  ];
  const maxBucket = Math.max(...scoreBuckets, 1);

  const recentForm = profile.recentForm || [];
  const seasonBreakdowns = profile.seasons || [];
  const splits = profile.splits || null;
  const records = profile.records || null;

  // batting by position data
  const byPosition = splits?.batting?.byPosition || null;
  const posEntries = byPosition
    ? Object.entries(byPosition)
        .filter(([, d]) => d.innings > 0)
        .sort(([a], [b]) => Number(a) - Number(b))
    : [];
  const maxPosRuns =
    posEntries.length > 0
      ? Math.max(...posEntries.map(([, d]) => d.runs), 1)
      : 1;

  const initials = (p.name || id || "P").slice(0, 1).toUpperCase();

  return (
    <div
      style={{
        padding: "16px 16px 80px",
        background: "var(--color-slate-50)",
        minHeight: "100vh",
      }}
    >
      {/* TOP NAV */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <button onClick={() => navigate(-1)} style={S.backBtn}>
          ← Back
        </button>
        <select
          style={S.seasonSelect}
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
        >
          <option value="overall">All Seasons</option>
          {seasons.map((season) => {
            const seasonId = season.id || season._id;
            return (
              <option key={seasonId} value={seasonId}>
                {season.seasonName || season.name || "Season"}
              </option>
            );
          })}
        </select>
      </div>

      {/* HERO */}
      <div
        style={{
          ...S.card,
          position: "relative",
          overflow: "hidden",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(99,102,241,0.05)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            position: "relative",
          }}
        >
          <div style={S.avatar}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-slate-900)",
                textTransform: "capitalize",
                letterSpacing: "-0.3px",
              }}
            >
              {p.name}
            </div>
            {teamNames.length > 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-slate-500)",
                  marginTop: 2,
                  textTransform: "capitalize",
                }}
              >
                {teamNames.join(" · ")}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <Pill color="purple">🏅 {achievements.mom} MOM</Pill>
              <Pill color="teal">
                📅 {seasonCount} season{seasonCount !== 1 ? "s" : ""}
              </Pill>
              <Pill color="blue">{totalMatch} matches</Pill>
              {records?.highestScore && (
                <Pill color="amber">🏏 HS {records.highestScore}</Pill>
              )}
              {records?.bestBowling && (
                <Pill color="green">🎯 BB {records.bestBowling}</Pill>
              )}
            </div>
          </div>
        </div>

        {/* Win / Loss bar */}
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-slate-500)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Win / Loss
            </span>
            <span style={{ fontSize: 11, color: "var(--color-slate-500)" }}>
              {wins}W · {losses}L · {winPct}%
            </span>
          </div>
          <div
            style={{
              height: 8,
              background: "var(--color-slate-100)",
              borderRadius: 4,
              overflow: "hidden",
              display: "flex",
            }}
          >
            {wins > 0 && (
              <div
                style={{
                  width: `${winPct}%`,
                  background: "linear-gradient(90deg,var(--color-emerald-500),#34d399)",
                  borderRadius: "4px 0 0 4px",
                }}
              />
            )}
            {losses > 0 && (
              <div
                style={{
                  flex: 1,
                  background: "var(--color-red-100)",
                  borderRadius: wins > 0 ? "0 4px 4px 0" : 4,
                }}
              />
            )}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <LegendDot color="var(--color-emerald-500)" label={`${wins} wins`} />
            <LegendDot color="var(--color-red-300)" label={`${losses} losses`} />
          </div>
        </div>

        {/* Quick stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 8,
            marginTop: 16,
          }}
        >
          <QuickStat
            icon="🏏"
            label="Bat Avg"
            value={derived.battingAverage || "0.00"}
          />
          <QuickStat
            icon="🎯"
            label="Bowl SR"
            value={derived.bowlingStrikeRate || "0.00"}
          />
          <QuickStat
            icon="💰"
            label="Economy"
            value={derived.economy || "0.00"}
          />
        </div>
      </div>

      {!stats.batting && selectedSeason !== "overall" && (
        <div style={S.noStatsBanner}>
          ⚠️ No performance data found for this player in the selected season.
        </div>
      )}

      {/* ── BATTING ── */}
      <SectionTitle>Batting Analytics</SectionTitle>
      <div style={S.grid4}>
        <BigStat
          label="Runs"
          value={batting.runs || 0}
          accent
          color="var(--color-indigo-600)"
        />
        <BigStat label="Average" value={derived.battingAverage || "0.00"} />
        <BigStat label="Strike Rate" value={derived.strikeRate || "0.00"} />
        <BigStat label="Innings" value={batting.innings || 0} />
      </div>
      <div style={{ ...S.card, marginTop: 8 }}>
        <Row label="Highest score" value={batting.highestScore?.runs ?? 0} />
        <Row
          label="4s / 6s"
          value={`${batting.fours || 0} / ${batting.sixes || 0}`}
        />
        <Row label="Not outs" value={batting.notOuts || 0} />
        <Row label="Ducks" value={batting.ducks || 0} />
        <Row label="Balls faced" value={batting.balls || 0} last />
      </div>

      {/* Milestones */}
      {batting.milestones && (
        <>
          <SubLabel>Milestones</SubLabel>
          <div style={S.grid3}>
            <MiniStatCard
              icon="🔥"
              label="30+"
              value={batting.milestones.thirtyPlus || 0}
            />
            <MiniStatCard
              icon="⭐"
              label="50+"
              value={batting.milestones.fiftyPlus || 0}
            />
            <MiniStatCard
              icon="💯"
              label="100+"
              value={batting.milestones.hundredPlus || 0}
            />
          </div>
        </>
      )}

      {/* ── BATTING BY POSITION ── new compact design */}
      {posEntries.length > 0 && (
        <>
          <SubLabel>Batting by Position</SubLabel>
          <div style={S.card}>
            {/* header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div style={{ width: 32, flexShrink: 0 }} />
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", gap: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--color-indigo-500)",
                    width: 36,
                    textAlign: "right",
                  }}
                >
                  Runs
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--color-sky-500)",
                    width: 32,
                    textAlign: "right",
                  }}
                >
                  Avg
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--color-emerald-500)",
                    width: 30,
                    textAlign: "right",
                  }}
                >
                  SR
                </span>
              </div>
            </div>
            {posEntries.map(([pos, d], i) => {
              const avg = d.outs > 0 ? (d.runs / d.outs).toFixed(1) : "—";
              const sr = d.balls > 0 ? Math.round((d.runs / d.balls) * 100) : 0;
              return (
                <div
                  key={pos}
                  style={{ marginBottom: i < posEntries.length - 1 ? 10 : 0 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 3,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "var(--color-violet-50)",
                        border: "1px solid var(--color-violet-100)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--color-indigo-600)",
                        flexShrink: 0,
                      }}
                    >
                      #{pos}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 8,
                        background: "var(--color-slate-100)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${(d.runs / maxPosRuns) * 100}%`,
                          height: "100%",
                          background: "var(--color-indigo-500)",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--color-slate-900)",
                          width: 36,
                          textAlign: "right",
                        }}
                      >
                        {d.runs}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--color-sky-500)",
                          width: 32,
                          textAlign: "right",
                        }}
                      >
                        {avg}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--color-emerald-500)",
                          width: 30,
                          textAlign: "right",
                        }}
                      >
                        {sr}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{ paddingLeft: 42, fontSize: 10, color: "var(--color-slate-400)" }}
                  >
                    {d.innings} inn · {d.outs} out
                    {d.fours > 0 ? ` · ${d.fours}×4` : ""}
                    {d.sixes > 0 ? ` · ${d.sixes}×6` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Score distribution */}
      {scoreBuckets.length > 0 && scoreBuckets.some((v) => v > 0) && (
        <>
          <SubLabel>Score Distribution</SubLabel>
          <div style={S.card}>
            {scoreBuckets.map(
              (count, i) =>
                count > 0 && (
                  <BarRow
                    key={i}
                    label={bucketLabels[i]}
                    value={count}
                    max={maxBucket}
                    color="var(--color-indigo-500)"
                  />
                ),
            )}
          </div>
        </>
      )}

      {/* Dismissal breakdown */}
      {dismissalEntries.length > 0 && (
        <>
          <SubLabel>Dismissal Breakdown</SubLabel>
          <div style={S.card}>
            {dismissalEntries.map(([type, count]) => (
              <BarRow
                key={type}
                label={type.replace(/([A-Z])/g, " $1")}
                value={count}
                max={maxDismissal}
                color="var(--color-indigo-500)"
              />
            ))}
            {batting.dismissalTypes?.notOut > 0 && (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTop: "1px solid var(--color-slate-100)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--color-slate-500)" }}>Not outs</span>
                <Pill color="green">{batting.dismissalTypes.notOut}×</Pill>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── DISMISSED BY — new avatar-row design ── */}
      {dismissedByList.length > 0 && (
        <>
          <SubLabel>Dismissed By</SubLabel>
          <div style={S.card}>
            {dismissedByList.map(
              ({ playerId, playerName, count, dismissalBreakdown }, i) => (
                <DismissedByRow
                  key={playerId}
                  playerId={playerId}
                  playerName={playerName}
                  count={count}
                  breakdown={dismissalBreakdown}
                  last={i === dismissedByList.length - 1}
                  onClick={() =>
                    navigate(`/player/${encodeURIComponent(playerId)}`)
                  }
                />
              ),
            )}
          </div>
        </>
      )}

      {/* Batting splits */}
      {splits?.batting?.byInnings && (
        <CollapsibleSection title="Batting Splits" icon="📊">
          <SubLabel style={{ margin: "0 0 8px" }}>By Innings</SubLabel>
          {Object.entries(splits.batting.byInnings).map(([inn, d]) => (
            <div key={inn} style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-slate-400)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                {inn}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <MiniStat label="Runs" value={d.runs} />
                <MiniStat label="Inn" value={d.innings} />
                <MiniStat
                  label="Avg"
                  value={d.outs > 0 ? (d.runs / d.outs).toFixed(1) : "N/A"}
                />
                <MiniStat
                  label="SR"
                  value={
                    d.balls > 0 ? ((d.runs / d.balls) * 100).toFixed(1) : "0.0"
                  }
                />
              </div>
            </div>
          ))}
          <SubLabel style={{ margin: "8px 0" }}>By Result</SubLabel>
          {Object.entries(splits.batting.byMatchResult).map(([res, d]) => (
            <div key={res} style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: res === "wins" ? "var(--color-emerald-500)" : "var(--color-red-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                {res}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <MiniStat label="Runs" value={d.runs} />
                <MiniStat label="Inn" value={d.innings} />
                <MiniStat
                  label="Avg"
                  value={d.outs > 0 ? (d.runs / d.outs).toFixed(1) : "N/A"}
                />
                <MiniStat
                  label="SR"
                  value={
                    d.balls > 0 ? ((d.runs / d.balls) * 100).toFixed(1) : "0.0"
                  }
                />
              </div>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* ── BOWLING ── */}
      <SectionTitle>Bowling Analytics</SectionTitle>
      <div style={S.grid4}>
        <BigStat
          label="Wickets"
          value={bowling.wickets || 0}
          accent
          color="var(--color-sky-500)"
        />
        <BigStat label="Average" value={derived.bowlingAverage || "0.00"} />
        <BigStat label="Economy" value={derived.economy || "0.00"} />
        <BigStat label="Innings" value={bowling.innings || 0} />
      </div>
      <div style={{ ...S.card, marginTop: 8 }}>
        <Row
          label="Best bowling"
          value={`${bowling.bestBowling?.wickets || 0} / ${bowling.bestBowling?.runs || 0}`}
        />
        <Row label="Strike rate" value={derived.bowlingStrikeRate || "0.00"} />
        <Row
          label="Overs bowled"
          value={
            derived.oversBowled ||
            (bowling.balls
              ? Math.floor(bowling.balls / 6) + "." + (bowling.balls % 6)
              : 0)
          }
        />
        <Row label="Maidens" value={bowling.maidens || 0} />
        <Row label="Runs conceded" value={bowling.runs || 0} />
        <Row
          label="3-wkt / 5-wkt hauls"
          value={`${bowling.wicketHauls?.threeWickets || 0} / ${bowling.wicketHauls?.fiveWickets || 0}`}
          last
        />
      </div>

      {/* Top wicket victims — same avatar-row design */}
      {dismissedBattersList.length > 0 && (
        <>
          <SubLabel>Top Wicket Victims</SubLabel>
          <div style={S.card}>
            {dismissedBattersList
              .slice(0, 8)
              .map(({ playerId, playerName, count, dismissalBreakdown }, i) => (
                <DismissedByRow
                  key={playerId}
                  playerId={playerId}
                  playerName={playerName}
                  count={count}
                  breakdown={dismissalBreakdown}
                  last={i === Math.min(dismissedBattersList.length, 8) - 1}
                  accentColor="blue"
                  onClick={() =>
                    navigate(`/player/${encodeURIComponent(playerId)}`)
                  }
                />
              ))}
            {dismissedBattersList.length > 8 && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  color: "var(--color-slate-400)",
                  paddingTop: 8,
                }}
              >
                +{dismissedBattersList.length - 8} more
              </div>
            )}
          </div>
        </>
      )}

      {/* Bowling splits */}
      {splits?.bowling?.byInnings && (
        <CollapsibleSection title="Bowling Splits" icon="📊">
          <SubLabel style={{ margin: "0 0 8px" }}>By Innings</SubLabel>
          {Object.entries(splits.bowling.byInnings).map(([inn, d]) => (
            <div key={inn} style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-slate-400)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                {inn}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <MiniStat label="Wkts" value={d.wickets} />
                <MiniStat label="Runs" value={d.runs} />
                <MiniStat
                  label="Avg"
                  value={
                    d.wickets > 0 ? (d.runs / d.wickets).toFixed(1) : "N/A"
                  }
                />
                <MiniStat
                  label="Eco"
                  value={
                    d.balls > 0 ? ((d.runs / d.balls) * 6).toFixed(1) : "0.0"
                  }
                />
              </div>
            </div>
          ))}
          <SubLabel style={{ margin: "8px 0" }}>By Result</SubLabel>
          {Object.entries(splits.bowling.byMatchResult).map(([res, d]) => (
            <div key={res} style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: res === "wins" ? "var(--color-emerald-500)" : "var(--color-red-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                {res}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <MiniStat label="Wkts" value={d.wickets} />
                <MiniStat
                  label="Eco"
                  value={
                    d.balls > 0 ? ((d.runs / d.balls) * 6).toFixed(1) : "0.0"
                  }
                />
                <MiniStat
                  label="SR"
                  value={
                    d.wickets > 0 ? (d.balls / d.wickets).toFixed(1) : "N/A"
                  }
                />
              </div>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* ── FIELDING ── */}
      <SectionTitle>Fielding Analytics</SectionTitle>
      <div style={S.grid3}>
        <BigStat label="Catches" value={fielding.catches || 0} />
        <BigStat label="Run Outs" value={fielding.runOuts || 0} />
        <BigStat label="Stumpings" value={fielding.stumpings || 0} />
      </div>

      {/* ── SEASON BREAKDOWN ── */}
      {seasonBreakdowns.length > 0 && selectedSeason === "All Seasons" && (
        <>
          <SectionTitle>Season by Season</SectionTitle>
          {seasonBreakdowns.map(({ season, stats: sd, derived: dd }) => (
            <div key={season._id} style={{ ...S.card, marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div>
                  <span
                    style={{ fontSize: 14, fontWeight: 700, color: "var(--color-slate-900)" }}
                  >
                    {season.seasonName}
                  </span>
                  <span
                    style={{ fontSize: 12, color: "var(--color-slate-500)", marginLeft: 8 }}
                  >
                    {sd.totalMatches || 0} matches
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Pill color="purple">🏅 {sd.achievements?.mom || 0} MOM</Pill>
                  <Pill color={sd.wins > sd.losses ? "green" : "amber"}>
                    {sd.wins || 0}W {sd.losses || 0}L
                  </Pill>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--color-slate-400)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  Batting
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 6,
                  }}
                >
                  <MiniStat label="Runs" value={sd.batting?.runs || 0} />
                  <MiniStat label="Avg" value={dd?.battingAverage || "—"} />
                  <MiniStat label="SR" value={dd?.strikeRate || "—"} />
                  <MiniStat
                    label="HS"
                    value={sd.batting?.highestScore?.runs ?? "—"}
                  />
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--color-slate-400)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  Bowling
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 6,
                  }}
                >
                  <MiniStat label="Wkts" value={sd.bowling?.wickets || 0} />
                  <MiniStat label="Avg" value={dd?.bowlingAverage || "—"} />
                  <MiniStat label="Eco" value={dd?.economy || "—"} />
                  <MiniStat
                    label="BB"
                    value={`${sd.bowling?.bestBowling?.wickets || 0}/${sd.bowling?.bestBowling?.runs || 0}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── RECENT FORM ── */}
      {recentForm.length > 0 && (
        <>
          <SectionTitle>Recent Form</SectionTitle>
          <div
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            {recentForm.map((m, idx) => (
              <div
                key={m.matchId || idx}
                title={`${m.won ? "Won" : "Lost"}`}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: m.won ? "#dcfce7" : "var(--color-red-100)",
                  border: `1.5px solid ${m.won ? "#86efac" : "var(--color-red-300)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: m.won ? "#166534" : "#991b1b",
                }}
              >
                {m.won ? "W" : "L"}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentForm.map((m, idx) => {
              const runs = m.batting?.runs ?? m.runs ?? 0;
              const balls = m.batting?.balls ?? m.balls ?? m.ballsFaced ?? 0;
              const fours = m.batting?.fours ?? m.fours ?? 0;
              const sixes = m.batting?.sixes ?? m.sixes ?? 0;
              const out = m.batting?.out;
              const batPos = m.batting?.battingPosition;
              const wickets = m.bowling?.wickets ?? m.wickets ?? 0;
              const bRuns = m.bowling?.runs ?? 0;
              const bBalls = m.bowling?.balls ?? m.ballsBowled ?? 0;
              const catches = m.catches ?? 0;
              const eco = bBalls > 0 ? ((bRuns / bBalls) * 6).toFixed(1) : null;
              const date = m.date || m.matchDate;
              const inn = m.inningsNumber;

              return (
                <div
                  key={m.matchId || idx}
                  style={{
                    ...S.card,
                    borderLeft: `3px solid ${m.won ? "var(--color-emerald-500)" : "#f87171"}`,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: m.won ? "var(--color-emerald-500)" : "var(--color-red-500)",
                        }}
                      >
                        {m.won ? "Win" : "Loss"}
                      </span>
                      {m.mom && <Pill color="amber">⭐ MOM</Pill>}
                      {inn && <Pill color="teal">Inn {inn}</Pill>}
                      {batPos && (
                        <span style={{ fontSize: 10, color: "var(--color-slate-400)" }}>
                          #{batPos}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--color-slate-400)" }}>
                      {date
                        ? new Date(date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })
                        : ""}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ minWidth: 70 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: "var(--color-slate-900)",
                            lineHeight: 1,
                          }}
                        >
                          {runs}
                        </span>
                        {out === false && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--color-emerald-500)",
                              fontWeight: 700,
                            }}
                          >
                            *
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: "var(--color-slate-400)" }}>
                          ({balls})
                        </span>
                      </div>
                      <div
                        style={{ fontSize: 11, color: "var(--color-slate-500)", marginTop: 2 }}
                      >
                        bat{" "}
                        {balls > 0 && (
                          <span style={{ color: "var(--color-indigo-600)", fontWeight: 600 }}>
                            SR {Math.round((runs / balls) * 100)}
                          </span>
                        )}
                      </div>
                      {(fours > 0 || sixes > 0) && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--color-slate-500)",
                            marginTop: 2,
                          }}
                        >
                          {fours > 0 && `${fours}×4 `}
                          {sixes > 0 && `${sixes}×6`}
                        </div>
                      )}
                    </div>
                    {(wickets > 0 || bBalls > 0) && (
                      <div
                        style={{
                          borderLeft: "1px solid var(--color-slate-200)",
                          paddingLeft: 16,
                          minWidth: 70,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 24,
                              fontWeight: 700,
                              color: "var(--color-sky-500)",
                              lineHeight: 1,
                            }}
                          >
                            {wickets}
                          </span>
                          <span style={{ fontSize: 12, color: "var(--color-slate-400)" }}>
                            /{bRuns}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--color-slate-500)",
                            marginTop: 2,
                          }}
                        >
                          bowl{" "}
                          {eco && (
                            <span style={{ color: "var(--color-sky-500)", fontWeight: 600 }}>
                              eco {eco}
                            </span>
                          )}
                        </div>
                        {bBalls > 0 && (
                          <div style={{ fontSize: 11, color: "var(--color-slate-400)" }}>
                            {Math.floor(bBalls / 6)}.{bBalls % 6} ov
                          </div>
                        )}
                      </div>
                    )}
                    {catches > 0 && (
                      <div
                        style={{
                          borderLeft: "1px solid var(--color-slate-200)",
                          paddingLeft: 16,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: "#8b5cf6",
                            lineHeight: 1,
                          }}
                        >
                          {catches}
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 400,
                              color: "var(--color-slate-400)",
                            }}
                          >
                            {" "}
                            ct
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--color-slate-500)",
                            marginTop: 2,
                          }}
                        >
                          field
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ height: 32 }} />
    </div>
  );
}

/* ── DismissedByRow — avatar + name + dismissal tags + count ── */
function DismissedByRow({
  playerId,
  playerName,
  count,
  breakdown,
  last,
  accentColor = "purple",
  onClick,
}) {
  const display = playerName || playerId.slice(-6);
  const initials = display.slice(0, 1).toUpperCase();

  // colour map for dismissal type tags
  const tagMap = {
    caught: { bg: "var(--color-blue-50)", color: "#1d4ed8", border: "#bfdbfe", label: "ct" },
    lbw: { bg: "var(--color-red-50)", color: "#991b1b", border: "#fecaca", label: "lbw" },
    bowled: { bg: "var(--color-amber-100)", color: "var(--color-amber-800)", border: "#fde68a", label: "b" },
    runOut: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", label: "ro" },
    stumped: {
      bg: "var(--color-violet-50)",
      color: "#5b21b6",
      border: "var(--color-violet-100)",
      label: "st",
    },
    hitWicket: {
      bg: "#fff1f2",
      color: "#9f1239",
      border: "#fecdd3",
      label: "hw",
    },
  };

  const accentMap = {
    purple: { bg: "var(--color-violet-50)", border: "var(--color-violet-100)", text: "var(--color-indigo-600)" },
    blue: { bg: "var(--color-blue-50)", border: "#bfdbfe", text: "var(--color-sky-500)" },
  };
  const ac = accentMap[accentColor];

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 0",
        borderBottom: last ? "none" : "1px solid var(--color-slate-100)",
        cursor: "pointer",
      }}
    >
      {/* avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: ac.bg,
          border: `2px solid ${ac.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          color: ac.text,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>

      {/* name + tags */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--color-slate-900)",
            textTransform: "capitalize",
            marginBottom: 4,
          }}
        >
          {display}
        </div>
        {breakdown && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {Object.entries(breakdown)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([k, v]) => {
                const t = tagMap[k] || {
                  bg: "var(--color-slate-100)",
                  color: "var(--color-slate-500)",
                  border: "var(--color-slate-200)",
                  label: k,
                };
                return (
                  <span
                    key={k}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 5,
                      background: t.bg,
                      color: t.color,
                      border: `1px solid ${t.border}`,
                    }}
                  >
                    {t.label} {v}
                  </span>
                );
              })}
          </div>
        )}
      </div>

      {/* count */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: ac.text,
            lineHeight: 1,
          }}
        >
          {count}
        </div>
        <div style={{ fontSize: 10, color: "var(--color-slate-400)", marginTop: 2 }}>
          times
        </div>
      </div>
    </div>
  );
}

/* ── Other sub-components ── */

const CollapsibleSection = ({ title, icon, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 10 }}>
      <button
        style={{
          ...S.collapsibleBtn,
          borderBottom: open ? "none" : "1px solid var(--color-slate-200)",
          borderRadius: open ? "14px 14px 0 0" : 14,
        }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{icon}</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        </span>
        <span style={{ fontSize: 10, color: "var(--color-slate-400)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div
          style={{
            background: "white",
            padding: "12px 16px 16px",
            borderRadius: "0 0 14px 14px",
            border: "1px solid var(--color-slate-200)",
            borderTop: "none",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 700,
      color: "var(--color-slate-400)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      margin: "24px 0 8px",
      paddingLeft: 2,
    }}
  >
    {children}
  </div>
);

const SubLabel = ({ children, style }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: "var(--color-slate-300)",
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      margin: "12px 0 6px",
      paddingLeft: 2,
      ...style,
    }}
  >
    {children}
  </div>
);

const BigStat = ({ label, value, accent, color }) => (
  <div
    style={{
      background: "white",
      borderRadius: 14,
      padding: "14px 12px",
      border: "1px solid var(--color-slate-200)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
    }}
  >
    <div
      style={{
        fontSize: 10,
        color: "var(--color-slate-400)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 5,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: accent ? color || "var(--color-indigo-600)" : "var(--color-slate-900)",
        lineHeight: 1,
      }}
    >
      {value}
    </div>
  </div>
);

const MiniStat = ({ label, value }) => (
  <div
    style={{
      flex: 1,
      background: "var(--color-slate-50)",
      borderRadius: 10,
      padding: "8px 10px",
      border: "1px solid var(--color-slate-100)",
      minWidth: 0,
    }}
  >
    <div
      style={{
        fontSize: 10,
        color: "var(--color-slate-400)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: 3,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-slate-900)" }}>
      {value}
    </div>
  </div>
);

const MiniStatCard = ({ icon, label, value }) => (
  <div
    style={{
      background: "white",
      borderRadius: 12,
      padding: "12px",
      border: "1px solid var(--color-slate-200)",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-slate-900)" }}>
      {value}
    </div>
    <div
      style={{
        fontSize: 10,
        color: "var(--color-slate-400)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginTop: 2,
      }}
    >
      {label}
    </div>
  </div>
);

const QuickStat = ({ icon, label, value }) => (
  <div
    style={{
      background: "var(--color-slate-50)",
      borderRadius: 10,
      padding: "10px",
      border: "1px solid var(--color-slate-100)",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    <span style={{ fontSize: 16 }}>{icon}</span>
    <div>
      <div
        style={{
          fontSize: 10,
          color: "var(--color-slate-400)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-slate-900)" }}>
        {value}
      </div>
    </div>
  </div>
);

const Row = ({ label, value, last }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: last ? "none" : "1px solid var(--color-slate-100)",
    }}
  >
    <span style={{ fontSize: 13, color: "var(--color-slate-500)" }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-slate-800)" }}>
      {value}
    </span>
  </div>
);

const BarRow = ({ label, value, max, color }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 0",
      borderBottom: "1px solid var(--color-slate-50)",
    }}
  >
    <span
      style={{
        fontSize: 12,
        color: "var(--color-slate-500)",
        width: 76,
        flexShrink: 0,
        textTransform: "capitalize",
      }}
    >
      {label}
    </span>
    <div
      style={{
        flex: 1,
        height: 6,
        background: "var(--color-slate-100)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${(value / max) * 100}%`,
          height: "100%",
          background: color,
          borderRadius: 3,
        }}
      />
    </div>
    <span
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: "var(--color-slate-800)",
        width: 20,
        textAlign: "right",
      }}
    >
      {value}
    </span>
  </div>
);

const Pill = ({ children, color }) => {
  const map = {
    purple: {
      background: "var(--color-violet-50)",
      color: "#5b21b6",
      border: "1px solid var(--color-violet-100)",
    },
    teal: {
      background: "#f0fdfa",
      color: "#0f766e",
      border: "1px solid #ccfbf1",
    },
    blue: {
      background: "var(--color-blue-50)",
      color: "#1d4ed8",
      border: "1px solid #dbeafe",
    },
    amber: {
      background: "#fffbeb",
      color: "var(--color-amber-800)",
      border: "1px solid #fde68a",
    },
    green: {
      background: "#f0fdf4",
      color: "#166534",
      border: "1px solid #bbf7d0",
    },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 8,
        ...map[color],
      }}
    >
      {children}
    </span>
  );
};

const LegendDot = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
    <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
    <span style={{ fontSize: 11, color: "var(--color-slate-500)" }}>{label}</span>
  </div>
);

const S = {
  card: {
    background: "white",
    borderRadius: 16,
    border: "1px solid var(--color-slate-200)",
    padding: "16px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
  },
  grid4: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "var(--color-violet-50)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    fontWeight: 700,
    color: "#5b21b6",
    flexShrink: 0,
    border: "2px solid var(--color-violet-100)",
  },
  seasonSelect: {
    padding: "7px 12px",
    borderRadius: 10,
    border: "1px solid var(--color-slate-200)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-slate-600)",
    background: "white",
    outline: "none",
  },
  backBtn: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid var(--color-slate-200)",
    background: "white",
    fontWeight: 600,
    fontSize: 13,
    color: "var(--color-slate-600)",
    cursor: "pointer",
  },
  collapsibleBtn: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "13px 16px",
    background: "white",
    border: "1px solid var(--color-slate-200)",
    cursor: "pointer",
  },
  noStatsBanner: {
    marginTop: 8,
    padding: "12px",
    background: "var(--color-red-50)",
    border: "1px solid var(--color-red-100)",
    borderRadius: 12,
    color: "var(--color-red-700)",
    fontSize: 13,
    textAlign: "center",
    fontWeight: 500,
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
  },
  spinner: {
    width: 30,
    height: 30,
    border: "3px solid var(--color-slate-200)",
    borderTop: "3px solid var(--color-indigo-500)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  homeBtn: {
    background: "var(--color-indigo-600)",
    color: "white",
    padding: "12px 24px",
    borderRadius: 12,
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
