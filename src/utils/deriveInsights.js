export function deriveInsights(match) {
  const { live, innings: allInnings, totalOvers = 20 } = match;

  // Live match → only innings till current innings
  // Older/completed match → all inning
  const visibleInnings = live
    ? allInnings.slice(0, live.inningsIndex + 1)
    : allInnings;

  const allBalls = visibleInnings.flatMap((inn) => inn.ballByBall ?? []);

  if (!allBalls.length) return null;

  const batterMap = {};
  const bowlerMap = {};
  const overMap = {};
  const h2h = {};

  /* ─────────────────────────────────────────────
     Helpers
  ───────────────────────────────────────────── */

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

  /* ─────────────────────────────────────────────
     Process innings
  ───────────────────────────────────────────── */

  visibleInnings.forEach((inn, inningsIdx) => {
    for (const ball of inn.ballByBall ?? []) {
      const { striker, bowler, runs, type, isWicket, over } = ball;

      if (!striker || !bowler) continue;

      const isLegal = type === "RUN";

      const isNoBall = type === "NO_BALL";

      const isWide = type === "WIDE";

      ensureBatter(striker);
      ensureBowler(bowler);

      const hk = ensureH2H(striker, bowler, inningsIdx);

      /* ─────────────────────────
           Over map
        ───────────────────────── */

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

      /* ─────────────────────────
           Batter stats
        ───────────────────────── */

      if (isLegal || isNoBall) {
        batterMap[striker].balls += 1;
        h2h[hk].balls += 1;

        if (runs === 0) {
          batterMap[striker].dots += 1;
          h2h[hk].dots += 1;
        }
      }

      if (!isWide) {
        const penalty = isNoBall ? 1 : 0;

        const batRuns = runs - penalty;

        if (batRuns > 0) {
          batterMap[striker].runs += batRuns;

          h2h[hk].runs += batRuns;

          if (batRuns === 4) {
            batterMap[striker].fours += 1;

            h2h[hk].fours += 1;
          }

          if (batRuns === 6) {
            batterMap[striker].sixes += 1;

            h2h[hk].sixes += 1;
          }
        }
      }

      /* ─────────────────────────
           Bowler stats
        ───────────────────────── */

      if (isWicket) {
        bowlerMap[bowler].wickets += 1;

        h2h[hk].wickets += 1;
      }

      bowlerMap[bowler].runs += runs;

      if (isLegal) {
        bowlerMap[bowler].balls += 1;

        if (runs === 0 && !isWicket) {
          bowlerMap[bowler].dots += 1;
        }
      }
    }
  });

  /* ─────────────────────────────────────────────
     Batters
  ───────────────────────────────────────────── */

  const batters = Object.entries(batterMap)
    .filter(([, s]) => s.balls > 0)
    .map(([name, s]) => ({
      name,
      runs: s.runs,
      balls: s.balls,
      dots: s.dots,
      fours: s.fours,
      sixes: s.sixes,
      sr: s.balls ? +((s.runs / s.balls) * 100).toFixed(1) : 0,
      dotPct: s.balls ? +((s.dots / s.balls) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.runs - a.runs);

  /* ─────────────────────────────────────────────
     Bowlers
  ───────────────────────────────────────────── */

  const bowlers = Object.entries(bowlerMap)
    .filter(([, s]) => s.balls > 0)
    .map(([name, s]) => ({
      name,
      runs: s.runs,
      balls: s.balls,
      dots: s.dots,
      wickets: s.wickets,
      eco: s.balls ? +(s.runs / (s.balls / 6)).toFixed(2) : 0,
      dotPct: s.balls ? +((s.dots / s.balls) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.balls - a.balls);

  /* ─────────────────────────────────────────────
     Run progression graph
  ───────────────────────────────────────────── */

  const oversByInnings = visibleInnings
    .map((inn, i) => {
      const balls = inn.ballByBall ?? [];

      const overNums = [...new Set(balls.map((b) => b.over))].sort(
        (a, b) => a - b,
      );

      let cum = 0;

      const points = [
        {
          over: 0,
          cumulative: 0,
        },
      ];

      for (const o of overNums) {
        const overBalls = balls.filter((b) => b.over === o);

        const runs = overBalls.reduce((s, b) => s + b.runs, 0);

        const wickets = overBalls.filter((b) => b.isWicket).length;

        cum += runs;

        points.push({
          over: o + 1,
          cumulative: cum,
          runs,
          wickets,
        });
      }

      return {
        inningsIdx: i,
        battingTeam: inn.battingTeam,
        points,
      };
    })
    .filter((inn) => inn.points.length > 1);

  /* ─────────────────────────────────────────────
     H2H list
  ───────────────────────────────────────────── */

  const h2hList = Object.values(h2h)
    .filter((r) => r.balls > 0)
    .map((r) => ({
      ...r,
      sr: r.balls ? +((r.runs / r.balls) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.balls - a.balls);

  /* ─────────────────────────────────────────────
     Cards
  ───────────────────────────────────────────── */

  const minBalls = 6;

  const mostRuns = [...batters].sort((a, b) => b.runs - a.runs)[0];

  const mostFours = [...batters].sort((a, b) => b.fours - a.fours)[0];

  const mostSixes = [...batters].sort((a, b) => b.sixes - a.sixes)[0];

  const highestSR = [...batters]
    .filter((b) => b.balls >= minBalls)
    .sort((a, b) => b.sr - a.sr)[0];

  const mostDotsBat = [...batters].sort((a, b) => b.dots - a.dots)[0];

  const mostWickets = [...bowlers].sort((a, b) => b.wickets - a.wickets)[0];

  const bestEco = [...bowlers]
    .filter((b) => b.balls >= minBalls)
    .sort((a, b) => a.eco - b.eco)[0];

  const mostExpensive = [...bowlers].sort((a, b) => b.eco - a.eco)[0];

  const mostDotsBowl = [...bowlers].sort((a, b) => b.dots - a.dots)[0];

  const biggestOver = Object.values(overMap).sort((a, b) => b.runs - a.runs)[0];

  Object.values(overMap).forEach((o) => {
    o.batterNames = [...o.batters].join(" & ");
  });

  const cards = [
    mostRuns && {
      label: "Top Scorer",
      value: mostRuns.runs,
      sub: mostRuns.name,
      detail: `${mostRuns.balls}b · SR ${mostRuns.sr}`,
      color: "#4f46e5",
    },

    highestSR && {
      label: "Highest SR",
      value: highestSR.sr,
      sub: highestSR.name,
      detail: `${highestSR.runs}(${highestSR.balls})`,
      color: "#16a34a",
    },

    mostFours && {
      label: "Most Fours",
      value: mostFours.fours,
      sub: mostFours.name,
      detail: `${mostFours.runs} runs`,
      color: "#3b82f6",
    },

    mostSixes && {
      label: "Most Sixes",
      value: mostSixes.sixes,
      sub: mostSixes.name,
      detail: `${mostSixes.runs} runs`,
      color: "#7c3aed",
    },

    mostDotsBat && {
      label: "Most Dots (Bat)",
      value: mostDotsBat.dots,
      sub: mostDotsBat.name,
      detail: `${mostDotsBat.dotPct}% of balls`,
      color: "#f59e0b",
    },

    mostWickets && {
      label: "Most Wickets",
      value: mostWickets.wickets,
      sub: mostWickets.name,
      detail: `${mostWickets.balls}b · Eco ${mostWickets.eco}`,
      color: "#dc2626",
    },

    bestEco && {
      label: "Best Economy",
      value: bestEco.eco,
      sub: bestEco.name,
      detail: `${bestEco.runs}r in ${bestEco.balls}b`,
      color: "#0891b2",
    },

    mostExpensive && {
      label: "Most Expensive",
      value: mostExpensive.eco,
      sub: mostExpensive.name,
      detail: `${mostExpensive.runs}r in ${mostExpensive.balls}b`,
      color: "#dc2626",
    },

    mostDotsBowl && {
      label: "Most Dots (Bowl)",
      value: mostDotsBowl.dots,
      sub: mostDotsBowl.name,
      detail: `${mostDotsBowl.dotPct}% dot balls`,
      color: "#ea580c",
    },

    biggestOver && {
      label: "Biggest Over",
      value: `${biggestOver.runs}`,
      sub: `${biggestOver.batterNames} vs ${biggestOver.bowler}`,
      detail: `${biggestOver.label} • ${biggestOver.wickets}W`,
      color: "#16a34a",
    },
  ].filter(Boolean);

  return {
    cards,
    oversByInnings,
    h2hList,
    batters,
    bowlers,
    totalOvers,
  };
}
