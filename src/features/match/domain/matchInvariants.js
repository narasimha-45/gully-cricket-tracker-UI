import {
  getPlayersForTeam,
  getMaxWickets,
  sameName,
} from "../../../utils/matchModel";

const nonNegative = (value) =>
  Number.isFinite(Number(value)) && Number(value) >= 0;

/**
 * Lightweight domain guardrails used for diagnostics. These do not block the
 * scorer; they surface impossible states early with action/revision context.
 */
export function getMatchInvariantViolations(match) {
  if (!match) return ["match is missing"];
  const issues = [];

  (match.innings || []).forEach((innings, index) => {
    if (!nonNegative(innings.totalRuns))
      issues.push(`innings[${index}].totalRuns is invalid`);
    if (!nonNegative(innings.wickets))
      issues.push(`innings[${index}].wickets is invalid`);
    if (!nonNegative(innings.balls))
      issues.push(`innings[${index}].balls is invalid`);

    const maxWickets = getMaxWickets(
      match,
      innings.battingTeam,
      Boolean(innings.isSuperOver),
    );
    if (Number(innings.wickets || 0) > maxWickets) {
      issues.push(`innings[${index}].wickets exceeds available wickets`);
    }
  });

  const live = match.live;
  if (live) {
    if (!match.innings?.[live.inningsIndex]) {
      issues.push("live.inningsIndex does not reference an innings");
      return issues;
    }

    const innings = match.innings[live.inningsIndex];
    if (
      live.striker &&
      live.nonStriker &&
      sameName(live.striker, live.nonStriker)
    ) {
      issues.push("striker and non-striker are the same player");
    }

    const battingPlayers = getPlayersForTeam(match, innings.battingTeam);
    const bowlingPlayers = getPlayersForTeam(match, innings.bowlingTeam);
    if (
      live.striker &&
      !battingPlayers.some((player) => sameName(player, live.striker))
    ) {
      issues.push("striker is not in the batting squad");
    }
    if (
      live.nonStriker &&
      !battingPlayers.some((player) => sameName(player, live.nonStriker))
    ) {
      issues.push("non-striker is not in the batting squad");
    }
    if (
      live.bowler &&
      !bowlingPlayers.some((player) => sameName(player, live.bowler))
    ) {
      issues.push("bowler is not in the bowling squad");
    }
  }

  if (match.result?.winner) {
    const belongsToMatch = [
      match.teams?.teamA?.name,
      match.teams?.teamB?.name,
    ].some((team) => sameName(team, match.result.winner));
    if (!belongsToMatch)
      issues.push("result winner is not one of the match teams");
  }

  return issues;
}
