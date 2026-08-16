import { getPlayersForTeam, sameName } from "../../../utils/matchModel";

export const selectCurrentInnings = (match) =>
  match?.innings?.[match?.live?.inningsIndex] || null;

export const selectCanScore = (match) =>
  Boolean(match?.live?.striker && match?.live?.nonStriker && match?.live?.bowler);

export const selectBowlingPlayers = (match) => {
  const innings = selectCurrentInnings(match);
  return innings ? getPlayersForTeam(match, innings.bowlingTeam) : [];
};

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
