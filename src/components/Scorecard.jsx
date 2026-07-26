// components/Scorecard.jsx
import { formatName } from "../utils/helpers";
import { isTestMatch, sameName, getTeamInningsOrdinal } from "../utils/matchModel";
import { derivePartnerships } from "../utils/partnerships";

export default function Scorecard({ match }) {
  const { innings: allInnings, teams, live } = match;

  const visibleInnings =
    live?.inningsIndex !== undefined
      ? allInnings.slice(0, live.inningsIndex + 1)
      : allInnings;

  const hasStarted = visibleInnings.some(
    (inn) => inn.balls > 0 || Object.keys(inn.battingStats || {}).length > 0,
  );

  if (!hasStarted) {
    return (
      <div style={emptyWrapStyle}>
        <h3 style={emptyTitleStyle}>Match not started</h3>
        <p style={emptySubStyle}>Scorecard will appear after the first ball.</p>
      </div>
    );
  }

  const mainInnings = isTestMatch(match)
    ? visibleInnings.filter((innings) => !innings.isSuperOver)
    : visibleInnings.slice(0, 2);
  const superOverInnings = isTestMatch(match)
    ? []
    : visibleInnings.slice(2);

  const superOverGroups = [];
  for (let i = 0; i < superOverInnings.length; i += 2) {
    superOverGroups.push({
      soNumber: Math.floor(i / 2) + 1,
      innings: superOverInnings.slice(i, i + 2),
    });
  }

  return (
    <div style={pageStyle}>
      {mainInnings.map((inn, idx) => (
        <InningsCard
          key={idx}
          innings={inn}
          teams={teams}
          label={
            isTestMatch(match)
              ? `${formatName(inn.battingTeam)} · ${getTeamInningsOrdinal(match, idx) === 1 ? "1st" : "2nd"} innings`
              : `Innings ${idx + 1} - ${formatName(inn.battingTeam)}`
          }
          headerColor="linear-gradient(135deg, var(--color-indigo-900), var(--color-indigo-700))"
        />
      ))}

      {superOverGroups.map((group) => (
        <div key={group.soNumber}>
          <div style={soSectionHeaderStyle}>Super Over {group.soNumber}</div>
          {group.innings.map((inn, idx) => (
            <InningsCard
              key={idx}
              innings={inn}
              teams={teams}
              label={inn.battingTeam}
              headerColor="linear-gradient(135deg, var(--color-red-700), var(--color-red-600))"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   InningsCard
───────────────────────────────────────────────────────────── */
function InningsCard({ innings, teams, label, headerColor }) {
  if (!innings || (innings.balls === 0 && innings.totalRuns === 0 && Object.keys(innings.battingStats || {}).length === 0)) return null;

  const battingPlayers =
    sameName(innings.battingTeam, teams.teamA.name)
      ? teams.teamA.players
      : teams.teamB.players;

  const battedPlayers = Object.keys(innings.battingStats || {});

  const didNotBat = battingPlayers.filter(
    (player) => !battedPlayers.some((batted) => sameName(batted, player)),
  );

  const overs = `${Math.floor(innings.balls / 6)}.${innings.balls % 6}`;
  const rr =
    innings.balls === 0
      ? "0.00"
      : (innings.totalRuns / (innings.balls / 6)).toFixed(2);

  const partnerships = derivePartnerships(innings);
  return (
    <div style={inningsCardStyle}>
      {/* Header */}
      <div style={{ ...headerStyle, background: headerColor }}>
        <div style={headerLeftStyle}>{label}</div>
        <div style={headerRightStyle}>
          {innings.totalRuns}/{innings.wickets}
          <span style={oversStyle}> ({overs} Ov)</span>
        </div>
      </div>
      {/* Batting header */}
      <div style={tableHeaderStyle}>
        <span style={{ textAlign: "left" }}>Batter</span>
        <span>R</span>
        <span>B</span>
        <span>4s</span>
        <span>6s</span>
        <span>SR</span>
      </div>

      {/* Batting rows */}
      {Object.entries(innings.battingStats || {})
        .sort(([, a], [, b]) => {
          const posA = a.battingPosition ?? Number.MAX_SAFE_INTEGER;
          const posB = b.battingPosition ?? Number.MAX_SAFE_INTEGER;
          return posA - posB;
        })
        .map(([p, s]) => {
          const sr =
            s.balls === 0 ? "0.00" : ((s.runs / s.balls) * 100).toFixed(2);

          return (
            <div key={p} style={rowStyle}>
              <div>
                <div style={playerStyle}>{formatName(p)}</div>
                <div style={dismissalStyle}>
                  {s.dismissal
                    ? formatDismissal(s.dismissal)
                    : innings.completed
                      ? "not out"
                      : "batting"}
                </div>
              </div>
              <span style={runsStyle}>{s.runs}</span>
              <span>{s.balls}</span>
              <span>{s.fours}</span>
              <span>{s.sixes}</span>
              <span>{sr}</span>
            </div>
          );
        })}

      {/* Extras */}
      <div style={infoRowStyle}>
        <span style={infoLabelStyle}>Extras</span>
        <span>
          {(innings.extras?.wides || 0) + (innings.extras?.noBalls || 0)} (Wd{" "}
          {innings.extras?.wides || 0}, Nb {innings.extras?.noBalls || 0})
        </span>
      </div>
      {/* Total */}
      <div style={infoRowStyle}>
        <span style={infoLabelStyle}>Total</span>
        <span style={{ fontWeight: 700 }}>
          {innings.totalRuns}-{innings.wickets} ({overs} Overs, RR: {rr})
        </span>
      </div>
      {/* Yet to bat */}
      {didNotBat.length > 0 && (
        <div style={infoRowStyle}>
          <span style={infoLabelStyle}>Yet to Bat</span>
          <span style={yetToBatStyle}>
            {didNotBat.map((p) => formatName(p)).join(", ")}
          </span>
        </div>
      )}
      {/* Bowling */}
      <div style={bowlingTitleStyle}>Bowling</div>
      <div style={tableHeaderStyle}>
        <span style={{ textAlign: "left" }}>Bowler</span>
        <span>O</span>
        <span>M</span>
        <span>R</span>
        <span>W</span>
        <span>Eco</span>
      </div>
      {Object.keys(innings.bowlingStats || {}).map((b) => {
        const s = innings.bowlingStats[b];
        const bowlerOvers = `${Math.floor(s.balls / 6)}.${s.balls % 6}`;
        const eco =
          s.balls === 0 ? "0.00" : (s.runs / (s.balls / 6)).toFixed(2);
        return (
          <div key={b} style={rowStyle}>
            <span style={playerStyle}>{formatName(b)}</span>
            <span>{bowlerOvers}</span>
            <span>{s.maidens}</span>
            <span>{s.runs}</span>
            <span>{s.wickets}</span>
            <span>{eco}</span>
          </div>
        );
      })}
      {/* ── Partnerships ────────────────────────────────────── */}
      {partnerships.length > 0 && (
        <>
          <div style={bowlingTitleStyle}>Partnerships</div>
          {partnerships.map((p, idx) => {
            const batters = Object.keys(p.contributions);
            const b1 = batters[0];
            const b2 = batters[1];
            const c1 = p.contributions[b1] || { runs: 0, balls: 0 };
            const c2 = b2 ? p.contributions[b2] || { runs: 0, balls: 0 } : null;
            const total = p.runs || 0;

            // Bar widths — split proportionally by runs, min 8% so name is readable
            const b1Pct =
              total === 0
                ? 50
                : Math.max(
                    8,
                    Math.min(92, Math.round((c1.runs / total) * 100)),
                  );
            const b2Pct = 100 - b1Pct;
            const isActive = p.isActive;

            return (
              <div
                key={`${b1}-${b2}-${idx}`}
                style={{
                  ...partnershipRowStyle,
                  background: isActive ? "#f0fdf4" : "var(--color-white)",
                }}
              >
                {/* Header row: wkt label + total */}
                <div style={partnershipTopRowStyle}>
                  <span
                    style={{
                      ...partnershipWktStyle,
                      color: isActive ? "var(--color-green-700)" : "var(--color-slate-400)",
                    }}
                  >
                    {isActive ? "Current" : `Wkt ${idx + 1}`}
                  </span>
                  <span
                    style={{
                      ...partnershipTotalStyle,
                      color: isActive ? "var(--color-green-700)" : "var(--color-slate-800)",
                    }}
                  >
                    {p.runs}{" "}
                    <span style={partnershipTotalBallsStyle}>({p.balls})</span>
                  </span>
                </div>

                {/* Horizontal bar */}
                <div style={partnershipBarWrapStyle}>
                  <div
                    style={{ ...partnershipBarB1Style, width: `${b1Pct}%` }}
                  />
                  <div
                    style={{ ...partnershipBarB2Style, width: `${b2Pct}%` }}
                  />
                </div>

                {/* Names + contributions below bar */}
                <div style={partnershipNamesRowStyle}>
                  <div style={partnershipNameLeftStyle}>
                    <span style={partnershipBatterNameStyle}>{b1}</span>
                    <span style={partnershipBatterContribStyle}>
                      {" "}
                      {c1.runs} ({c1.balls})
                    </span>
                  </div>
                  {b2 && c2 && (
                    <div style={partnershipNameRightStyle}>
                      <span style={partnershipBatterNameStyle}>{b2}</span>
                      <span style={partnershipBatterContribStyle}>
                        {" "}
                        {c2.runs} ({c2.balls})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function formatDismissal(d) {
  if (!d) return "batting";
  switch (d.type) {
    case "CAUGHT":
      return `c ${d.fielder} b ${d.bowler}`;
    case "BOWLED":
      return `b ${d.bowler}`;
    case "LBW":
      return `lbw b ${d.bowler}`;
    case "STUMPED":
      return `st ${d.fielder} b ${d.bowler}`;
    case "RUN_OUT":
      return d.fielder ? `run out (${d.fielder})` : "run out";
    case "HIT_WICKET":
      return `hit wicket b ${d.bowler}`;
    default:
      return d.type.toLowerCase();
  }
}

/* ── Styles ─────────────────────────────────────────────────── */

const pageStyle = { display: "flex", flexDirection: "column", gap: 14 };
const soSectionHeaderStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--color-red-700)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  padding: "8px 4px 4px",
};

const inningsCardStyle = {
  background: "var(--color-white)",
  borderRadius: 14,
  overflow: "hidden",
  border: "1px solid var(--color-gray-200)",
  boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
};
const headerStyle = {
  color: "var(--color-white)",
  padding: "14px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};
const headerLeftStyle = { fontSize: 15, fontWeight: 700 };
const headerRightStyle = { fontSize: 22, fontWeight: 700, letterSpacing: 1 };
const oversStyle = { fontSize: 14, fontWeight: 600, opacity: 0.85 };

const tableHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "2.8fr repeat(5, 1fr)",
  alignItems: "center",
  background: "var(--color-indigo-50)",
  padding: "10px 14px",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--color-indigo-700)",
  borderBottom: "1px solid var(--color-indigo-100)",
};
const rowStyle = {
  display: "grid",
  gridTemplateColumns: "2.8fr repeat(5, 1fr)",
  alignItems: "center",
  padding: "12px 14px",
  fontSize: 14,
  color: "var(--color-gray-900)",
  borderBottom: "1px solid var(--color-gray-100)",
  background: "var(--color-white)",
};
const playerStyle = {
  fontSize: 14,
  fontWeight: 500,
  color: "var(--color-indigo-900)",
  lineHeight: 1.4,
};
const dismissalStyle = { marginTop: 2, fontSize: 11, color: "var(--color-gray-500)" };
const runsStyle = { fontWeight: 800, color: "var(--color-gray-900)" };

const infoRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  padding: "12px 14px",
  borderBottom: "1px solid var(--color-gray-100)",
  fontSize: 13,
  color: "var(--color-gray-900)",
  background: "#fafafa",
};
const infoLabelStyle = { fontWeight: 700, minWidth: 90, color: "var(--color-gray-900)" };
const yetToBatStyle = { color: "var(--color-indigo-700)", lineHeight: 1.6, fontWeight: 500 };
const bowlingTitleStyle = {
  padding: "16px 14px 8px",
  fontSize: 15,
  fontWeight: 700,
  color: "var(--color-gray-900)",
};

/* Partnership styles — horizontal bar design */
const partnershipRowStyle = {
  padding: "10px 14px 12px",
  borderBottom: "1px solid var(--color-gray-100)",
};

const partnershipTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
};

const partnershipWktStyle = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const partnershipTotalStyle = {
  fontSize: 15,
  fontWeight: 800,
  fontVariantNumeric: "tabular-nums",
};

const partnershipTotalBallsStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-slate-500)",
};

const partnershipBarWrapStyle = {
  display: "flex",
  height: 6,
  borderRadius: 999,
  overflow: "hidden",
  marginBottom: 6,
  gap: 2,
};

const partnershipBarB1Style = {
  height: "100%",
  background: "#3b82f6",
  borderRadius: 999,
  transition: "width 0.3s ease",
};

const partnershipBarB2Style = {
  height: "100%",
  background: "var(--color-amber-500)",
  borderRadius: 999,
  transition: "width 0.3s ease",
};

const partnershipNamesRowStyle = {
  display: "flex",
  justifyContent: "space-between",
};

const partnershipNameLeftStyle = {
  display: "flex",
  alignItems: "baseline",
  gap: 3,
};

const partnershipNameRightStyle = {
  display: "flex",
  alignItems: "baseline",
  gap: 3,
  textAlign: "right",
};

const partnershipBatterNameStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-slate-800)",
};

const partnershipBatterContribStyle = {
  fontSize: 11,
  color: "var(--color-slate-500)",
  fontVariantNumeric: "tabular-nums",
};

const emptyWrapStyle = {
  background: "var(--color-white)",
  borderRadius: 14,
  padding: "48px 24px",
  textAlign: "center",
  border: "1px solid var(--color-gray-200)",
};
const emptyTitleStyle = {
  marginBottom: 8,
  fontSize: 18,
  fontWeight: 700,
  color: "var(--color-gray-900)",
};
const emptySubStyle = { fontSize: 13, color: "var(--color-slate-500)" };
