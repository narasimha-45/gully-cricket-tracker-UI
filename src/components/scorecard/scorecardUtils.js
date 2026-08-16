export function hasInningsStarted(innings) {
  return Boolean(
    innings &&
    ((Number(innings.balls) || 0) > 0 ||
      (Number(innings.totalRuns) || 0) > 0 ||
      Object.keys(innings.battingStats ?? {}).length > 0),
  );
}

export function sortBatters([, left], [, right]) {
  return (
    (left?.battingPosition ?? Number.MAX_SAFE_INTEGER) -
    (right?.battingPosition ?? Number.MAX_SAFE_INTEGER)
  );
}

export function formatOvers(balls) {
  const safeBalls = Math.max(0, Number(balls) || 0);
  return `${Math.floor(safeBalls / 6)}.${safeBalls % 6}`;
}

export function ordinalLabel(value) {
  return value === 1 ? "1st" : value === 2 ? "2nd" : `${value ?? ""}th`;
}

export function inningsKey(innings, index) {
  return `${innings?.battingTeam ?? "innings"}-${innings?.isSuperOver ? "so" : "main"}-${index}`;
}

export function partnershipKey(partnership, index) {
  const players = Object.keys(partnership.contributions ?? {}).join("-");
  return `${players}-${partnership.startBall ?? index}-${index}`;
}

export function toPairs(items) {
  const result = [];
  for (let index = 0; index < items.length; index += 2) {
    result.push(items.slice(index, index + 2));
  }
  return result;
}

export function formatDismissal(dismissal) {
  if (!dismissal) return "batting";
  switch (dismissal.type) {
    case "CAUGHT":
      return `c ${dismissal.fielder ?? ""} b ${dismissal.bowler ?? ""}`.trim();
    case "BOWLED":
      return `b ${dismissal.bowler ?? ""}`.trim();
    case "LBW":
      return `lbw b ${dismissal.bowler ?? ""}`.trim();
    case "STUMPED":
      return `st ${dismissal.fielder ?? ""} b ${dismissal.bowler ?? ""}`.trim();
    case "RUN_OUT":
      return dismissal.fielder ? `run out (${dismissal.fielder})` : "run out";
    case "HIT_WICKET":
      return `hit wicket b ${dismissal.bowler ?? ""}`.trim();
    default:
      return String(dismissal.type ?? "out")
        .toLowerCase()
        .replaceAll("_", " ");
  }
}
