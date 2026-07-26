import { calcCRR } from "./calcutors";
import { formatName } from "./helpers";
import {
  getFinalInningsTarget,
  getScheduledInningsCount,
  getScheduledTeamsForInnings,
  getTeamInningsOrdinal,
  getTestLeadStatus,
  isTestMatch,
} from "./matchModel";

const ordinalLabel = (number) => (number === 1 ? "1st" : "2nd");

export function formatMatchResult(result) {
  if (!result) return "Match complete";
  if (result.type === "DRAW" || result.winner === "DRAW") return "Match drawn";
  if (result.type === "TIE" || result.winner === "TIE") return "Match tied";
  if (result.type === "SUPER_OVER") {
    return `${formatName(result.winner)} won via Super Over`;
  }
  if (result.type === "INNINGS") {
    const unit = Number(result.margin) === 1 ? "run" : "runs";
    return `${formatName(result.winner)} won by an innings and ${result.margin} ${unit}`;
  }
  const isWickets = result.type === "WICKETS";
  const unit = Number(result.margin) === 1
    ? isWickets ? "wicket" : "run"
    : isWickets ? "wickets" : "runs";
  return `${formatName(result.winner)} won by ${result.margin} ${unit}`;
}

export function buildMatchHeroRows(match) {
  const currentIndex = match.live.inningsIndex;

  if (isTestMatch(match)) {
    return Array.from({ length: getScheduledInningsCount(match) }, (_, index) => {
      const existing = match.innings[index] || null;
      const teams = existing || getScheduledTeamsForInnings(match, index);
      const ordinal = getTeamInningsOrdinal(match, index);
      return {
        key: `test-${index}`,
        label: `${formatName(teams.battingTeam)} · ${ordinalLabel(ordinal)}`,
        innings: existing,
        isCurrent: index === currentIndex && match.status !== "COMPLETED",
        isFuture: index > currentIndex,
      };
    });
  }

  const rows = [];
  for (let index = 0; index < 2; index += 1) {
    const existing = match.innings[index] || null;
    const teams = existing || getScheduledTeamsForInnings(match, index);
    rows.push({
      key: `main-${index}`,
      label: formatName(teams.battingTeam),
      innings: existing,
      isCurrent: index === currentIndex && match.status !== "COMPLETED",
      isFuture: index > currentIndex,
    });
  }

  for (let index = 2; index < match.innings.length; index += 2) {
    const superOverNumber = Math.floor((index - 2) / 2) + 1;
    rows.push({
      key: `super-label-${superOverNumber}`,
      isSectionLabel: true,
      label: `Super Over ${superOverNumber}`,
    });

    [index, index + 1].forEach((inningsIndex) => {
      const existing = match.innings[inningsIndex];
      if (!existing) return;
      rows.push({
        key: `super-${inningsIndex}`,
        label: formatName(existing.battingTeam),
        innings: existing,
        isCurrent:
          inningsIndex === currentIndex && match.status !== "COMPLETED",
        isSuperOver: true,
      });
    });
  }

  return rows;
}

export function buildMatchStatusLine(match) {
  if (match.status === "COMPLETED") {
    return { type: "text", text: formatMatchResult(match.result) };
  }

  const currentIndex = match.live.inningsIndex;
  const innings = match.innings[currentIndex];
  const crr = calcCRR(innings.totalRuns, innings.balls);

  if (isTestMatch(match)) {
    const target = getFinalInningsTarget(match, currentIndex);
    if (target) {
      return {
        type: "test",
        crr,
        text: `Need ${Math.max(0, target - innings.totalRuns)} runs · Target ${target}`,
      };
    }

    const leadStatus = getTestLeadStatus(match, currentIndex);
    const teamName = formatName(innings.battingTeam);
    const text = !leadStatus
      ? "First innings in progress"
      : leadStatus.type === "LEVEL"
        ? "Scores level"
        : `${teamName} ${leadStatus.type === "LEAD" ? "lead" : "trail"} by ${leadStatus.difference}`;

    return { type: "test", crr, text };
  }

  if (currentIndex % 2 === 0) {
    return {
      type: "crr",
      crr,
      isSuperOver: Boolean(innings.isSuperOver),
      superOverNumber: innings.isSuperOver
        ? Math.floor((currentIndex - 2) / 2) + 1
        : null,
    };
  }

  const previous = match.innings[currentIndex - 1];
  const target = previous.totalRuns + 1;
  const overLimit = innings.isSuperOver ? 1 : Number(match.totalOvers);
  const totalBalls = Number.isFinite(overLimit) ? overLimit * 6 : innings.balls;
  const ballsLeft = Math.max(0, totalBalls - innings.balls);
  const need = Math.max(0, target - innings.totalRuns);

  return {
    type: "chase",
    crr,
    rrr: ballsLeft > 0 ? (need / (ballsLeft / 6)).toFixed(2) : "∞",
    need,
    ballsLeft,
    isSuperOver: Boolean(innings.isSuperOver),
  };
}

export function getBallPresentation(ball, match) {
  if (ball.type === "WICKET") {
    return {
      label: ball.runs > 0 ? `W+${ball.runs}` : "W",
      kind: "wicket",
    };
  }

  if (ball.type === "WIDE") {
    const totalWideRuns = Number(ball.runs || 0);
    return {
      label: totalWideRuns > 1 ? `${totalWideRuns}Wd` : "Wd",
      kind: "wide",
    };
  }

  if (ball.type === "NO_BALL") {
    const automatic = match.rules?.noBall?.extraRun ? 1 : 0;
    const battingRuns = Math.max(0, ball.runs - automatic);
    return {
      label: battingRuns > 0 ? `Nb+${battingRuns}` : "Nb",
      kind: "noBall",
    };
  }

  if (ball.runs === 4) return { label: "4", kind: "four" };
  if (ball.runs === 6) return { label: "6", kind: "six" };
  return { label: String(ball.runs), kind: "normal" };
}
