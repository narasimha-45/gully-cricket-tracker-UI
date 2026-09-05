/** Convert ball count → overs string:
 *  7 balls → "1.1"
 *  12 balls → "2.0"
 */

const BOWLER_WICKET_TYPES = new Set([
  "BOWLED",
  "CAUGHT",
  "LBW",
  "STUMPED",
  "HIT_WICKET",
  "SPECIAL",
]);

function ballsToOvers(balls) {
  const fullOvers = Math.floor(balls / 6);

  const remainingBalls = balls % 6;

  return `${fullOvers}.${remainingBalls}`;
}

export function deriveInsights(match) {
  if (!match) {
    return null;
  }

  const { live, innings: allInnings = [] } = match;

  if (!allInnings.length) {
    return null;
  }

  /* ============================================================
     TOTAL OVERS
     ============================================================ */

  const configuredOvers = Number(match.totalOvers);

  const longestInningsOvers = Math.max(
    1,

    ...allInnings.map((innings) =>
      Math.max(
        1,

        Math.ceil((innings.balls || 0) / 6),
      ),
    ),
  );

  const totalOvers =
    Number.isFinite(configuredOvers) && configuredOvers > 0
      ? configuredOvers
      : longestInningsOvers;

  /* ============================================================
     VISIBLE INNINGS

     During live match only consider innings up to current innings.
     ============================================================ */

  const visibleInnings = live
    ? allInnings.slice(0, live.inningsIndex + 1)
    : allInnings;

  const allBalls = visibleInnings.flatMap(
    (innings) => innings.ballByBall ?? [],
  );

  if (!allBalls.length) {
    return null;
  }

  /* ============================================================
     INTERNAL MAPS
     ============================================================ */

  const batterMap = {};
  const bowlerMap = {};
  const overMap = {};
  const h2h = {};

  /* ============================================================
     HELPERS
     ============================================================ */

  const ensureBatter = (name) => {
    if (!batterMap[name]) {
      batterMap[name] = {
        runs: 0,
        balls: 0,
        dots: 0,
        fours: 0,
        sixes: 0,
      };
    }
  };

  const ensureBowler = (name) => {
    if (!bowlerMap[name]) {
      bowlerMap[name] = {
        runs: 0,
        balls: 0,
        dots: 0,
        wickets: 0,
      };
    }
  };

  const ensureH2H = (batter, bowler, inningsIdx) => {
    /*
      Include innings index so each innings
      is stored independently.

      UI can later aggregate when
      "All Innings" is selected.
    */

    const key = `${inningsIdx}|||${batter}|||${bowler}`;

    if (!h2h[key]) {
      h2h[key] = {
        inningsIdx,

        batter,
        bowler,

        runs: 0,
        balls: 0,

        dots: 0,

        fours: 0,
        sixes: 0,

        wickets: 0,
      };
    }

    return key;
  };

  /* ============================================================
     PROCESS INNINGS
     ============================================================ */

  visibleInnings.forEach((inn, inningsIdx) => {
    for (const ball of inn.ballByBall ?? []) {
      const { striker, bowler, runs = 0, type, isWicket, over } = ball;

      /*
          RETIRE is not an actual delivery.
        */

      if (ball.type === "RETIRE") {
        continue;
      }

      if (!striker || !bowler) {
        continue;
      }

      const isWide = type === "WIDE";

      const isNoBall = type === "NO_BALL";

      const isLegal = !isWide && !isNoBall;

      // A no-ball is still faced by the batter — it only fails to count
      // toward the innings/over/bowler tally, which is what `isLegal` gates.
      const battingBallFaced = !isWide;

      const wicketType = ball.wicket?.type;

      const isBowlerWicket = Boolean(
        isWicket && !isNoBall && BOWLER_WICKET_TYPES.has(wicketType),
      );

      ensureBatter(striker);
      ensureBowler(bowler);

      const h2hKey = ensureH2H(striker, bowler, inningsIdx);

      /* ======================================================
           OVER MAP
           ====================================================== */

      const overKey = `${inningsIdx}-${over}`;

      if (!overMap[overKey]) {
        overMap[overKey] = {
          label: `Inn${inningsIdx + 1} Ov${over + 1}`,

          runs: 0,
          wickets: 0,

          inningsIdx,
          over,

          batters: new Set(),

          bowler,
        };
      }

      overMap[overKey].batters.add(striker);

      overMap[overKey].runs += runs;

      if (isWicket) {
        overMap[overKey].wickets += 1;
      }

      /* ======================================================
           BATTER RUNS (computed first so dot-ball check below
           can use the batter's actual runs, not the raw total
           which may include an automatic no-ball extra)
           ====================================================== */

      // Prefer explicit battingRuns if available; otherwise derive
      // batter runs from total runs (stripping the automatic no-ball run).
      const batRuns = isWide
        ? 0
        : Number.isFinite(ball.battingRuns)
          ? ball.battingRuns
          : runs - (isNoBall && match.rules?.noBall?.extraRun ? 1 : 0);

      if (!isWide && batRuns > 0) {
        batterMap[striker].runs += batRuns;

        h2h[h2hKey].runs += batRuns;

        if (batRuns === 4) {
          batterMap[striker].fours += 1;

          h2h[h2hKey].fours += 1;
        }

        if (batRuns === 6) {
          batterMap[striker].sixes += 1;

          h2h[h2hKey].sixes += 1;
        }
      }

      /* ======================================================
           BATTER BALL / DOT STATISTICS
           ====================================================== */

      if (battingBallFaced) {
        batterMap[striker].balls += 1;

        h2h[h2hKey].balls += 1;

        /*
            Dot ball for the batter: 0 runs scored off the bat.
            A no-ball still counts here if the batter scored nothing
            off it (the automatic no-ball run is not the batter's).
          */

        if (batRuns === 0) {
          batterMap[striker].dots += 1;

          h2h[h2hKey].dots += 1;
        }
      }

      /* ======================================================
           BOWLER WICKETS
           ====================================================== */

      if (isBowlerWicket) {
        bowlerMap[bowler].wickets += 1;

        h2h[h2hKey].wickets += 1;
      }

      /* ======================================================
           BOWLER RUNS
           ====================================================== */

      bowlerMap[bowler].runs += runs;

      /* ======================================================
           BOWLER BALLS / DOTS
           ====================================================== */

      if (isLegal) {
        bowlerMap[bowler].balls += 1;

        /*
            A wicket ball with zero runs
            is still a dot ball.
          */

        if (runs === 0) {
          bowlerMap[bowler].dots += 1;
        }
      }
    }
  });

  /* ============================================================
     BATTER LIST
     ============================================================ */

  const batters = Object.entries(batterMap)
    .filter(([, stats]) => stats.balls > 0 || stats.runs > 0)
    .map(([name, stats]) => ({
      name,

      runs: stats.runs,

      balls: stats.balls,

      dots: stats.dots,

      fours: stats.fours,

      sixes: stats.sixes,

      sr: stats.balls ? +((stats.runs / stats.balls) * 100).toFixed(1) : 0,

      dotPct: stats.balls ? +((stats.dots / stats.balls) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.runs - a.runs);

  /* ============================================================
     BOWLER LIST
     ============================================================ */

  const bowlers = Object.entries(bowlerMap)
    .filter(
      ([, stats]) => stats.balls > 0 || stats.runs > 0 || stats.wickets > 0,
    )
    .map(([name, stats]) => ({
      name,

      runs: stats.runs,

      balls: stats.balls,

      overs: ballsToOvers(stats.balls),

      dots: stats.dots,

      wickets: stats.wickets,

      eco: stats.balls ? +(stats.runs / (stats.balls / 6)).toFixed(2) : 0,

      dotPct: stats.balls ? +((stats.dots / stats.balls) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.balls - a.balls);

  /* ============================================================
     RUN PROGRESSION
     ============================================================ */

  const oversByInnings = visibleInnings
    .map((inn, inningsIdx) => {
      const balls = inn.ballByBall ?? [];

      const overNums = [
        ...new Set(
          balls
            .filter((ball) => ball.type !== "RETIRE")
            .map((ball) => ball.over),
        ),
      ].sort((a, b) => a - b);

      let cumulativeRuns = 0;

      let cumulativeWickets = 0;

      const points = [
        {
          over: 0,

          cumulative: 0,

          runs: 0,

          wickets: 0,

          wicketsThisOver: 0,
        },
      ];

      for (const overNumber of overNums) {
        const overBalls = balls.filter(
          (ball) => ball.over === overNumber && ball.type !== "RETIRE",
        );

        const runs = overBalls.reduce((sum, ball) => sum + (ball.runs || 0), 0);

        const wicketsThisOver = overBalls.filter(
          (ball) => ball.isWicket,
        ).length;

        cumulativeRuns += runs;

        cumulativeWickets += wicketsThisOver;

        points.push({
          over: overNumber + 1,

          cumulative: cumulativeRuns,

          runs,

          wickets: cumulativeWickets,

          wicketsThisOver,
        });
      }

      return {
        inningsIdx,

        battingTeam: inn.battingTeam,

        points,
      };
    })
    .filter((inn) => inn.points.length > 1);

  /* ============================================================
     H2H LIST
     ============================================================ */

  const h2hList = Object.values(h2h)
    .filter((row) => row.balls > 0 || row.runs > 0 || row.wickets > 0)
    .map((row) => ({
      ...row,

      sr: row.balls ? +((row.runs / row.balls) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.balls - a.balls);

  const teamSummaries = visibleInnings
    .map((inn, inningsIdx) => {
      const summary = {
        inningsIdx,
        team: inn.battingTeam,
        runs: 0,
        balls: 0,
        dots: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
      };

      for (const ball of inn.ballByBall ?? []) {
        if (ball.type === "RETIRE" || !ball.striker) continue;

        const isWide = ball.type === "WIDE";
        const isNoBall = ball.type === "NO_BALL";
        const batRuns = isWide
          ? 0
          : Number.isFinite(ball.battingRuns)
            ? ball.battingRuns
            : (ball.runs || 0) -
              (isNoBall && match.rules?.noBall?.extraRun ? 1 : 0);

        summary.runs += ball.runs || 0;

        if (ball.isWicket) summary.wickets += 1;

        if (isWide) continue;

        summary.balls += 1;

        if (batRuns === 0) summary.dots += 1;
        if (batRuns === 4) summary.fours += 1;
        if (batRuns === 6) summary.sixes += 1;
      }

      return summary;
    })
    .filter((summary) => summary.balls > 0);

  /* ============================================================
     INSIGHT CARD DATA
     ============================================================ */

  const minBalls = 1;

  /* Batting */

  const mostRuns = [...batters].sort((a, b) => b.runs - a.runs)[0];

  const mostFours = [...batters].sort((a, b) => b.fours - a.fours)[0];

  const mostSixes = [...batters].sort((a, b) => b.sixes - a.sixes)[0];

  const highestSR = [...batters]
    .filter((batter) => batter.balls >= minBalls)
    .sort((a, b) => b.sr - a.sr)[0];

  const mostDotsBat = [...batters].sort((a, b) => b.dots - a.dots)[0];

  /* Bowling */

  const mostWickets = [...bowlers].sort((a, b) => b.wickets - a.wickets)[0];

  const bestEco = [...bowlers]
    .filter((bowler) => bowler.balls >= minBalls)
    .sort((a, b) => a.eco - b.eco)[0];

  const mostExpensive = [...bowlers].sort((a, b) => b.eco - a.eco)[0];

  const mostDotsBowl = [...bowlers].sort((a, b) => b.dots - a.dots)[0];

  /* ============================================================
     BIGGEST / COSTLIEST OVER
     ============================================================ */

  const biggestOver = Object.values(overMap).sort((a, b) => b.runs - a.runs)[0];

  Object.values(overMap).forEach((overStats) => {
    overStats.batterNames = [...overStats.batters].join(" & ");
  });

  /* ============================================================
     CARDS
     ============================================================ */

  const cards = [
    mostRuns && {
      group: "batting",

      label: "Top Scorer",

      value: mostRuns.runs,

      sub: mostRuns.name,

      detail: `${mostRuns.balls}b · SR ${mostRuns.sr}`,

      color: "var(--color-indigo-600)",
    },

    highestSR && {
      group: "batting",

      label: "Highest SR",

      value: highestSR.sr,

      sub: highestSR.name,

      detail: `${highestSR.runs}(${highestSR.balls})`,

      color: "var(--color-green-600)",
    },

    mostFours && {
      group: "batting",

      label: "Most Fours",

      value: mostFours.fours,

      sub: mostFours.name,

      detail: `${mostFours.runs} runs`,

      color: "var(--color-violet-600)",
    },

    mostSixes && {
      group: "batting",

      label: "Most Sixes",

      value: mostSixes.sixes,

      sub: mostSixes.name,

      detail: `${mostSixes.runs} runs`,

      color: "var(--color-amber-500)",
    },

    mostDotsBat && {
      group: "batting",

      label: "Most Dots (Bat)",

      value: mostDotsBat.dots,

      sub: mostDotsBat.name,

      detail: `${mostDotsBat.dotPct}% of balls`,

      color: "var(--color-slate-500)",
    },

    mostWickets && {
      group: "bowling",

      label: "Most Wickets",

      value: mostWickets.wickets,

      sub: mostWickets.name,

      detail: `${mostWickets.overs} ov · Eco ${mostWickets.eco}`,

      color: "var(--color-red-600)",
    },

    bestEco && {
      group: "bowling",

      label: "Best Economy",

      value: bestEco.eco,

      sub: bestEco.name,

      detail: `${bestEco.runs}r in ${bestEco.overs} ov`,

      color: "var(--color-green-600)",
    },

    mostExpensive && {
      group: "bowling",

      label: "Most Expensive",

      value: mostExpensive.eco,

      sub: mostExpensive.name,

      detail: `${mostExpensive.runs}r in ${mostExpensive.overs} ov`,

      color: "var(--color-amber-500)",
    },

    mostDotsBowl && {
      group: "bowling",

      label: "Most Dots (Bowl)",

      value: mostDotsBowl.dots,

      sub: mostDotsBowl.name,

      detail: `${mostDotsBowl.dotPct}% dot balls`,

      color: "var(--color-slate-500)",
    },

    biggestOver && {
      group: "moment",

      label: "Costliest Over",

      value: `${biggestOver.runs}`,

      sub: `${biggestOver.batterNames} vs ${biggestOver.bowler}`,

      detail: `${biggestOver.label} · ${biggestOver.wickets}W`,

      color: "var(--color-indigo-600)",
    },
  ].filter(Boolean);

  /* ============================================================
     RETURN
     ============================================================ */

  return {
    cards,

    oversByInnings,

    h2hList,

    teamSummaries,

    batters,

    bowlers,

    totalOvers,
  };
}
