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
    const {
      striker,
      nonStriker,
      runs = 0,
      type,
      isWicket,
    } = ball;

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

    const key     = pairKey(striker, nonStriker);
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

    const isLegal  = type === "RUN";
    const isNoBall = type === "NO_BALL";
    const isWide   = type === "WIDE";

    const extraRun =
      (isWide || isNoBall) ? 1 : 0;

    const battingRuns = Math.max(0, runs - extraRun);

    // Batter runs
    if (!isWide && battingRuns > 0) {
      current.contributions[striker].runs += battingRuns;
    }

    // Batter balls
    if (isLegal || isNoBall) {
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

  return all.findLast((p) => p.isActive) ?? null;
}