import { getPlayersForTeam, sameName } from "../../../utils/matchModel";

/** @typedef {import("../domain/matchTypes").Match} Match */
/** @typedef {import("../domain/matchTypes").Innings} Innings */

/** @param {Match} match @returns {Innings|null} */
export const selectCurrentInnings = (match) =>
  match?.innings?.[match?.live?.inningsIndex] || null;

/** @param {Match} match @returns {boolean} True once striker, non-striker, and bowler are all set. */
export const selectCanScore = (match) =>
  Boolean(
    match?.live?.striker && match?.live?.nonStriker && match?.live?.bowler,
  );

/** @param {Match} match @returns {string[]} Normalized player names available to bowl. */
export const selectBowlingPlayers = (match) => {
  const innings = selectCurrentInnings(match);
  return innings ? getPlayersForTeam(match, innings.bowlingTeam) : [];
};

/** @param {Match} match @returns {string[]} Batting-side players not out, not already at the crease, and not the current bowler (joker rule). */
export const selectEligibleBatters = (match) => {
  const innings = selectCurrentInnings(match);
  if (!innings) return [];
  const live = match.live;
  return getPlayersForTeam(match, innings.battingTeam).filter(
    (player) =>
      !(live.outBatsmen || []).some((out) => sameName(out, player)) &&
      !sameName(player, live.striker) &&
      !sameName(player, live.nonStriker) &&
      !sameName(player, live.bowler),
  );
};
