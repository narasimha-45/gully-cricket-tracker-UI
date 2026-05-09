// components/Scorecard.jsx
export default function Scorecard({ match }) {
  const { innings, teams, totalOvers } = match;

  const hasStarted = innings?.some(
    (inn) =>
      inn.balls > 0 ||
      Object.keys(inn.battingStats || {}).length > 0 ||
      Object.keys(inn.bowlingStats || {}).length > 0
  );

  if (!hasStarted) {
  return (
    <div style={emptyState}>
      <h3 style={{ marginBottom: 6, color: "#111827" }}>
        Match not yet started
      </h3>
      <p>The scorecard will appear once the first ball is bowled.</p>
    </div>
  );
}

  return (
    <div>
      {innings.map((inn, idx) => (
        <InningsCard
          key={idx}
          innings={inn}
          teams={teams}
          totalOvers={totalOvers}
        />
      ))}
    </div>
  );
}

const emptyState = {
  padding: "40px 16px",
  textAlign: "center",
  color: "#6b7280",
  background: "#f9fafb",
  borderRadius: 14,
  border: "1px dashed #e5e7eb",
};



function getAllBattedPlayers(innings, battingTeamPlayers, live) {
  const set = new Set();

  // Faced a ball
  Object.keys(innings.battingStats || {}).forEach((p) => {
    if (battingTeamPlayers.includes(p)) set.add(p);
  });

  // Got out
  (innings.outBatsmen || []).forEach((p) => {
    if (battingTeamPlayers.includes(p)) set.add(p);
  });

  // Only include live players if they belong to batting team
  if (live?.striker && battingTeamPlayers.includes(live.striker)) {
    set.add(live.striker);
  }

  if (live?.nonStriker && battingTeamPlayers.includes(live.nonStriker)) {
    set.add(live.nonStriker);
  }

  return Array.from(set);
}

function getDismissalText(player, innings) {
  const d = innings.dismissals?.[player];

  if (!d) return "not out";

  switch (d.type) {
    case "BOWLED":
      return `b ${d.bowler}`;

    case "CAUGHT":
      return `c ${d.fielder} b ${d.bowler}`;

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

function InningsCard({ innings, index, teams, totalOvers, live, matchStatus }) {
  if (!innings || innings.balls === 0) return null;

  const battingTeamPlayers =
    innings.battingTeam === teams.teamA.name
      ? teams.teamA.players
      : teams.teamB.players;

  const battedPlayers = Object.keys(innings.battingStats || []);

  const didNotBat = battingTeamPlayers.filter(
    (p) => !battedPlayers.includes(p)
  );

  const overs = `${Math.floor(innings.balls / 6)}.${innings.balls % 6}`;

  const rr =
    innings.balls === 0
      ? "0.00"
      : (innings.totalRuns / (innings.balls / 6)).toFixed(2);

  return (
    <div style={card}>
      <h3 style={{ marginBottom: 6 }}>
        {innings.battingTeam} – {innings.totalRuns}/{innings.wickets}
      </h3>

      <p style={sub}>
        Overs: {overs} / {totalOvers} &nbsp; | &nbsp; RR: {rr}
      </p>

      <BattingTable innings={innings} battedPlayers={battedPlayers} />
      {didNotBat.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
          <strong>Did not bat:</strong> {didNotBat.join(", ")}
        </div>
      )}

      <ExtrasRow innings={innings} />

      <BowlingTable innings={innings} />
    </div>
  );
}

function formatDismissal(d) {
  if (!d) return "not out";

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

function BattingTable({ innings }) {
  const players = Object.keys(innings.battingStats || {}).filter(
    (p) => p !== "null" && p !== "undefined"
  );

  return (
    <>
      <h4>Batting</h4>

      <div style={tableHeader}>
        <span>Batter</span>
        <span>R</span>
        <span>B</span>
        <span>4s</span>
        <span>6s</span>
        <span>SR</span>
      </div>

      {players.map((p) => {
        const s = innings.battingStats[p] || {
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
        };

        const sr =
          s.balls === 0 ? "0.00" : ((s.runs / s.balls) * 100).toFixed(1);

        // const dismissal = getDismissalText(p, innings);

        return (
          <div key={p} style={row}>
            <span>
              <div style={{ fontWeight: 600 }}>{p}</div>
              <div
                style={{
                  fontSize: 12,
                  color: s.dismissal ? "#6b7280" : "#16a34a",
                }}
              >
                {s.dismissal ? formatDismissal(s.dismissal) : "not out"}
              </div>
            </span>

            <span>{s.runs}</span>
            <span>{s.balls}</span>
            <span>{s.fours}</span>
            <span>{s.sixes}</span>
            <span>{sr}</span>
          </div>
        );
      })}
    </>
  );
}

function ExtrasRow({ innings }) {
  const { wides = 0, noBalls = 0 } = innings.extras || {};
  const extras = wides + noBalls;

  //   const extras = wides + noBalls;

  return (
    <div style={{ marginTop: 8, fontWeight: 600 }}>
      Extras: {extras} (Wd {wides}, Nb {noBalls})
    </div>
  );
}

function BowlingTable({ innings }) {
  const bowlers = Object.keys(innings.bowlingStats || {});

  return (
    <>
      <h4 style={{ marginTop: 12 }}>Bowling</h4>

      <div style={tableHeader}>
        <span>Bowler</span>
        <span>O</span>
        <span>M</span>
        <span>R</span>
        <span>W</span>
        <span>Eco</span>
      </div>

      {bowlers.map((b) => {
        const s = innings.bowlingStats[b];
        const overs = `${Math.floor(s.balls / 6)}.${s.balls % 6}`;
        const eco =
          s.balls === 0 ? "0.00" : (s.runs / (s.balls / 6)).toFixed(2);

        return (
          <div key={b} style={row}>
            <span>{b}</span>
            <span>{overs}</span>
            <span>{s.maidens}</span>
            <span>{s.runs}</span>
            <span>{s.wickets}</span>
            <span>{eco}</span>
          </div>
        );
      })}
    </>
  );
}

/* ---------------- STYLES ---------------- */

const card = {
  background: "#f9fafb",
  padding: 14,
  borderRadius: 14,
  marginBottom: 20,
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(5,1fr)",
  fontSize: 13,
  color: "#6b7280",
  fontWeight: 600,
  paddingBottom: 6,
  borderBottom: "1px solid #e5e7eb",
};

const row = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(5,1fr)",
  padding: "8px 0",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 14,
};

const sub = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 10,
};
