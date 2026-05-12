// components/Scorecard.jsx

export default function Scorecard({ match }) {
  const { innings, teams } = match;

  const hasStarted = innings?.some(
    (inn) =>
      inn.balls > 0 ||
      Object.keys(inn.battingStats || {}).length > 0
  );

  if (!hasStarted) {
    return (
      <div style={emptyWrapStyle}>
        <h3 style={emptyTitleStyle}>
          Match not started
        </h3>

        <p style={emptySubStyle}>
          Scorecard will appear after the first ball.
        </p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {innings.map((inn, idx) => (
        <InningsCard
          key={idx}
          innings={inn}
          teams={teams}
          inningNumber={idx + 1}
        />
      ))}
    </div>
  );
}

function InningsCard({
  innings,
  teams,
  inningNumber,
}) {
  if (!innings || innings.balls === 0)
    return null;

  const battingPlayers =
    innings.battingTeam ===
    teams.teamA.name
      ? teams.teamA.players
      : teams.teamB.players;

  const battedPlayers = Object.keys(
    innings.battingStats || {}
  );

  const didNotBat = battingPlayers.filter(
    (p) => !battedPlayers.includes(p)
  );

  const overs = `${Math.floor(
    innings.balls / 6
  )}.${innings.balls % 6}`;

  const rr =
    innings.balls === 0
      ? "0.00"
      : (
          innings.totalRuns /
          (innings.balls / 6)
        ).toFixed(2);

  return (
    <div style={inningsCardStyle}>
      {/* HEADER */}
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          {innings.battingTeam}
        </div>

        <div style={headerRightStyle}>
          {innings.totalRuns} - 
          {innings.wickets}

          <span style={oversStyle}>
            {" "}
            ({overs} Ov)
          </span>
        </div>
      </div>

      {/* BATTING HEADER */}
      <div style={tableHeaderStyle}>
        <span
          style={{
            textAlign: "left",
          }}
        >
          Batter
        </span>

        <span>R</span>
        <span>B</span>
        <span>4s</span>
        <span>6s</span>
        <span>SR</span>
      </div>

      {/* BATTING ROWS */}
      {Object.keys(
        innings.battingStats || {}
      ).map((p) => {
        const s =
          innings.battingStats[p];

        const sr =
          s.balls === 0
            ? "0.00"
            : (
                (s.runs / s.balls) *
                100
              ).toFixed(2);

        return (
          <div
            key={p}
            style={rowStyle}
          >
            {/* PLAYER */}
            <div>
              <div
                style={playerStyle}
              >
                {p}
              </div>

              <div
                style={dismissalStyle}
              >
                {s.dismissal
                  ? formatDismissal(
                      s.dismissal
                    )
                  : "batting"}
              </div>
            </div>

            {/* STATS */}
            <span style={runsStyle}>
              {s.runs}
            </span>

            <span>{s.balls}</span>

            <span>{s.fours}</span>

            <span>{s.sixes}</span>

            <span>{sr}</span>
          </div>
        );
      })}

      {/* EXTRAS */}
      <div style={infoRowStyle}>
        <span
          style={infoLabelStyle}
        >
          Extras
        </span>

        <span>
          {(innings.extras?.wides ||
            0) +
            (innings.extras
              ?.noBalls || 0)}{" "}
          (Wd{" "}
          {innings.extras?.wides ||
            0}
          , Nb{" "}
          {innings.extras
            ?.noBalls || 0}
          )
        </span>
      </div>

      {/* TOTAL */}
      <div style={infoRowStyle}>
        <span
          style={infoLabelStyle}
        >
          Total
        </span>

        <span
          style={{
            fontWeight: 700,
          }}
        >
          {innings.totalRuns} - 
          {innings.wickets} (
          {overs} Overs, RR: {rr})
        </span>
      </div>

      {/* YET TO BAT */}
      {didNotBat.length > 0 && (
        <div style={infoRowStyle}>
          <span
            style={infoLabelStyle}
          >
            Yet to Bat
          </span>

          <span
            style={yetToBatStyle}
          >
            {didNotBat.join(", ")}
          </span>
        </div>
      )}

      {/* BOWLING */}
      <div style={bowlingTitleStyle}>
        Bowling
      </div>

      <div style={tableHeaderStyle}>
        <span
          style={{
            textAlign: "left",
          }}
        >
          Bowler
        </span>

        <span>O</span>
        <span>M</span>
        <span>R</span>
        <span>W</span>
        <span>Eco</span>
      </div>

      {Object.keys(
        innings.bowlingStats || {}
      ).map((b) => {
        const s =
          innings.bowlingStats[b];

        const bowlerOvers = `${Math.floor(
          s.balls / 6
        )}.${s.balls % 6}`;

        const eco =
          s.balls === 0
            ? "0.00"
            : (
                s.runs /
                (s.balls / 6)
              ).toFixed(2);

        return (
          <div
            key={b}
            style={rowStyle}
          >
            <span
              style={playerStyle}
            >
              {b}
            </span>

            <span>
              {bowlerOvers}
            </span>

            <span>
              {s.maidens}
            </span>

            <span>{s.runs}</span>

            <span>
              {s.wickets}
            </span>

            <span>{eco}</span>
          </div>
        );
      })}
    </div>
  );
}

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
      return d.fielder
        ? `run out (${d.fielder})`
        : "run out";

    case "HIT_WICKET":
      return `hit wicket b ${d.bowler}`;

    default:
      return d.type.toLowerCase();
  }
}

/* ---------------- STYLES ---------------- */

const pageStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const inningsCardStyle = {
  background: "#ffffff",

  borderRadius: 14,

  overflow: "hidden",

  border:
    "1px solid #e5e7eb",

  boxShadow:
    "0 2px 10px rgba(15,23,42,0.04)",
};

const headerStyle = {
  background:
    "linear-gradient(135deg,#4f46e5,#4338ca)",

  color: "#fff",

  padding: "14px 16px",

  display: "flex",

  justifyContent:
    "space-between",

  alignItems: "center",
};

const headerLeftStyle = {
  fontSize: 19,

  fontWeight: 700,

  letterSpacing: -0.3,
};

const headerRightStyle = {
  fontSize: 28,

  fontWeight: 800,

  letterSpacing: -1,
};

const oversStyle = {
  fontSize: 15,

  fontWeight: 600,

  opacity: 0.9,
};

const bowlingTitleStyle = {
  padding:
    "18px 14px 10px",

  fontSize: 16,

  fontWeight: 700,

  color: "#111827",
};

const tableHeaderStyle = {
  display: "grid",

  gridTemplateColumns:
    "2.8fr repeat(5,1fr)",

  alignItems: "center",

  background: "#eef2ff",

  padding: "12px 14px",

  fontSize: 12,

  fontWeight: 700,

  color: "#4338ca",

  borderBottom:
    "1px solid #e0e7ff",
};

const rowStyle = {
  display: "grid",

  gridTemplateColumns:
    "2.8fr repeat(5,1fr)",

  alignItems: "center",

  padding: "14px",

  fontSize: 14,

  color: "#111827",

  borderBottom:
    "1px solid #f3f4f6",

  background: "#fff",
};

const playerStyle = {
  fontSize: 16,

  fontWeight: 500,

  color: "#312e81",

  lineHeight: 1.4,
};

const dismissalStyle = {
  marginTop: 3,

  fontSize: 12,

  color: "#6b7280",

  lineHeight: 1.5,
};

const runsStyle = {
  fontWeight: 800,

  color: "#111827",
};

const infoRowStyle = {
  display: "flex",

  justifyContent:
    "space-between",

  gap: 14,

  padding: "14px",

  borderBottom:
    "1px solid #f3f4f6",

  fontSize: 14,

  color: "#111827",

  background: "#fafafa",
};

const infoLabelStyle = {
  fontWeight: 700,

  minWidth: 90,

  color: "#111827",
};

const yetToBatStyle = {
  color: "#4338ca",

  lineHeight: 1.6,

  fontWeight: 500,
};

const emptyWrapStyle = {
  background: "#fff",

  borderRadius: 14,

  padding: "50px 24px",

  textAlign: "center",

  border:
    "1px solid #e5e7eb",
};

const emptyTitleStyle = {
  marginBottom: 8,

  fontSize: 20,

  fontWeight: 700,

  color: "#111827",
};

const emptySubStyle = {
  fontSize: 14,

  color: "#64748b",
};