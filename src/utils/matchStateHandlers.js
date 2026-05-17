import { saveMatch } from "../storage/matchDB";

/* ─────────────────────────────────────────────────────────────
   endFirstInnings
   Marks innings[0] complete and opens the "Start 2nd innings"
   popup. Does NOT set result — that happens in endMatch.
───────────────────────────────────────────────────────────── */
export const endFirstInnings = (updated, setMatch) => {
  updated.innings[0].completed = true;
  updated.live.pendingNextInnings = true;

  saveMatch(updated);
  setMatch(updated);
};

/* ─────────────────────────────────────────────────────────────
   endMatch
   Called when the match is definitively over (not tied).
   type: "CHASE" | "DEFEND"

   Uses the last two innings in the array so it works correctly
   for both main match and super overs.
───────────────────────────────────────────────────────────── */
export const endMatch = (updated, type, setMatch) => {
  updated.status = "COMPLETED";

  const total = updated.innings.length;

  // batting-first innings of this pair
  const i1 = updated.innings[total - 2];

  // chasing innings of this pair
  const i2 = updated.innings[total - 1];

  const isSO = !!i2.isSuperOver;

  if (type === "CHASE") {
    const battingPlayers =
      i2.battingTeam === updated.teams.teamA.name
        ? updated.teams.teamA.players
        : updated.teams.teamB.players;

    const wicketsLeft = (isSO ? 2 : battingPlayers.length - 1) - i2.wickets;

    updated.result = {
      winner: i2.battingTeam,
      type: isSO ? "SUPER_OVER" : "WICKETS",
      margin: wicketsLeft,
    };
  } else {
    // DEFEND — batting-first team successfully defended target
    updated.result = {
      winner: i1.battingTeam,
      type: isSO ? "SUPER_OVER" : "RUNS",
      margin: i1.totalRuns - i2.totalRuns,
    };
  }

  updated.ui = {
    ...(updated.ui || {}),
    matchResultSeen: false,
  };

  saveMatch(updated);
  setMatch(updated);
};

/* ─────────────────────────────────────────────────────────────
   updateLive
   Shallow-merge updates into match.live
───────────────────────────────────────────────────────────── */
export const updateLive = (updates, match, setMatch) => {
  const updated = {
    ...match,
    live: {
      ...match.live,
      ...updates,
    },
    updatedAt: Date.now(),
  };

  saveMatch(updated);
  setMatch(updated);
};

/* ─────────────────────────────────────────────────────────────
   evaluateMatchState

   Called after every scoring event.
   Handles:
   - wins
   - innings completion
   - ties
   - super overs

   Returns:
   true  => match state changed
   false => nothing happened
───────────────────────────────────────────────────────────── */
export const evaluateMatchState = (updated, setMatch) => {
  const { live, innings, teams, totalOvers } = updated;

  const currentInnings = innings[live.inningsIndex];

  const battingPlayers =
    currentInnings.battingTeam === teams.teamA.name
      ? teams.teamA.players
      : teams.teamB.players;

  /* ─────────────────────────────────────────────────────────
     CHASING INNINGS
     Check if target already achieved
  ───────────────────────────────────────────────────────── */
  if (live.inningsIndex % 2 === 1) {
    const prevInnings = innings[live.inningsIndex - 1];

    const target = prevInnings.totalRuns + 1;

    if (isTargetAchieved(currentInnings, target)) {
      endMatch(updated, "CHASE", setMatch);
      return true;
    }
  }

  /* ─────────────────────────────────────────────────────────
     INNINGS COMPLETE
  ───────────────────────────────────────────────────────── */
  if (isInningsComplete(currentInnings, battingPlayers, totalOvers)) {
    /* ── MAIN MATCH FIRST INNINGS ───────────────────────── */
    if (live.inningsIndex === 0) {
      endFirstInnings(updated, setMatch);
      return true;
    }

    /* ── CHASING INNINGS ────────────────────────────────── */
    const isChasingInnings = live.inningsIndex % 2 === 1;

    if (isChasingInnings) {
      const prevInnings = innings[live.inningsIndex - 1];

      /* ── TIE ──────────────────────────────────────────── */
      if (currentInnings.totalRuns === prevInnings.totalRuns) {
        updated.live.pendingSuperOver = true;

        saveMatch(updated);
        setMatch(updated);

        return true;
      }

      /* ── DEFENDED TARGET ─────────────────────────────── */
      endMatch(updated, "DEFEND", setMatch);
      return true;
    }

    /* ── FIRST INNINGS OF SUPER OVER PAIR ──────────────── */
    const isFirstSuperOverInnings =
      currentInnings.isSuperOver && live.inningsIndex % 2 === 0;

    if (isFirstSuperOverInnings) {
      const nextIndex = innings.length;

      updated.live.inningsIndex = nextIndex;

      updated.innings[nextIndex] = {
        battingTeam: currentInnings.bowlingTeam,
        bowlingTeam: currentInnings.battingTeam,

        totalRuns: 0,
        balls: 0,
        wickets: 0,

        battingStats: {},
        bowlingStats: {},

        thisOver: [],
        ballByBall: [],

        isSuperOver: true,

        extras: {
          wides: 0,
          noBalls: 0,
        },
      };

      updated.live.striker = null;
      updated.live.nonStriker = null;
      updated.live.bowler = null;
      updated.live.lastOverBowler = null;
      updated.live.outBatsmen = [];

      saveMatch(updated);
      setMatch(updated);

      return true;
    }
  }

  return false;
};

/* ─────────────────────────────────────────────────────────────
   isInningsComplete
───────────────────────────────────────────────────────────── */
export const isInningsComplete = (innings, battingPlayers, totalOvers) => {
  const overLimit = innings.isSuperOver ? 1 : totalOvers;

  const wicketLimit = innings.isSuperOver ? 2 : battingPlayers.length - 1;

  if (innings.balls >= overLimit * 6) {
    return true;
  }

  if (innings.wickets >= wicketLimit) {
    return true;
  }

  return false;
};

/* ─────────────────────────────────────────────────────────────
   isTargetAchieved
───────────────────────────────────────────────────────────── */
export const isTargetAchieved = (innings, target) => {
  return innings.totalRuns >= target;
};
