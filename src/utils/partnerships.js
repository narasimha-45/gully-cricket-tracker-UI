/**
 * derivePartnerships(innings)
 *
 * Cricket partnership rules:
 *
 * - Partnership identified by SORTED pair.
 * - Same pair resumes after retirement.
 * - Partnership ends permanently ONLY on wicket.
 * - Retirement merely pauses partnership.
 */

export function derivePartnerships(innings) {
  if (!innings?.ballByBall?.length) return [];

  const partnershipMap = new Map();

  let activePairKey = null;

  const pairKey = (a, b) => [a, b].sort().join("|||");

  const getOrCreate = (a, b) => {
    const key = pairKey(a, b);

    if (!partnershipMap.has(key)) {
      partnershipMap.set(key, {
        batter1: a < b ? a : b,
        batter2: a < b ? b : a,

        runs: 0,
        balls: 0,

        contributions: {
          [a]: { runs: 0, balls: 0 },
          [b]: { runs: 0, balls: 0 },
        },

        isActive: true,
        isWicket: false,
      });
    }

    return partnershipMap.get(key);
  };

  for (const ball of innings.ballByBall) {
    const { striker, nonStriker, runs = 0, type, isWicket } = ball;

    // Retirement only pauses current partnership
    if (type === "RETIRE") {
      if (activePairKey) {
        const prev = partnershipMap.get(activePairKey);

        if (prev && !prev.isWicket) {
          prev.isActive = false;
        }
      }

      activePairKey = null;
      continue;
    }

    if (!striker || !nonStriker) continue;

    const key = pairKey(striker, nonStriker);
    const current = getOrCreate(striker, nonStriker);

    // Switch active partnership
    if (activePairKey && activePairKey !== key) {
      const prev = partnershipMap.get(activePairKey);

      // Only pause if not wicket-ended
      if (prev && !prev.isWicket) {
        prev.isActive = false;
      }
    }

    activePairKey = key;

    current.isActive = true;

    // Runs
    current.runs += runs;

    const isNoBall = type === "NO_BALL" || ball.extra === "NO_BALL";
    const isWide = type === "WIDE" || ball.extra === "WIDE";
    const isBye = type === "BYE" || ball.extra === "BYE";
    // A no-ball is still faced by the batter (it just doesn't count toward
    // the innings/over tally) — only a wide isn't a ball faced.
    const battingBallFaced = !isWide;
    const battingRuns = Number.isFinite(ball.battingRuns)
      ? ball.battingRuns
      : isWide || isBye
        ? 0
        : Math.max(0, runs - (isNoBall ? 1 : 0));

    // Batter runs
    if (!isWide && battingRuns > 0) {
      current.contributions[striker].runs += battingRuns;
    }

    // Batter balls
    if (battingBallFaced) {
      current.balls += 1;
      current.contributions[striker].balls += 1;
    }

    // Wicket permanently ends partnership
    if (isWicket) {
      current.isActive = false;
      current.isWicket = true;
      activePairKey = null;
    }
  }

  return Array.from(partnershipMap.values());
}

/**
 * getCurrentPartnership(innings)
 */
export function getCurrentPartnership(innings) {
  const all = derivePartnerships(innings);

  for (let index = all.length - 1; index >= 0; index -= 1) {
    if (all[index].isActive) return all[index];
  }
  return null;
}
