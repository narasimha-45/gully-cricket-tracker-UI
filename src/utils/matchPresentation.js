import { calcCRR } from "./calculators";
import { formatName } from "./helpers";
import {
  getFinalInningsTarget,
  getScheduledInningsCount,
  getScheduledTeamsForInnings,
  getTestLeadStatus,
  isTestMatch,
  sameName,
} from "./matchModel";

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
  const unit =
    Number(result.margin) === 1
      ? isWickets
        ? "wicket"
        : "run"
      : isWickets
        ? "wickets"
        : "runs";
  return `${formatName(result.winner)} won by ${result.margin} ${unit}`;
}

export function buildMatchHeroRows(match) {
  const currentIndex = match.live.inningsIndex;

  // Once a match is COMPLETED there's no "live" innings left to bold, so every
  // row used to fall back to the same muted grey — a completed match looked
  // flatter than a live one even though the result is the most interesting
  // part. Keeping the winner's row bold (and the loser's muted) preserves the
  // same light/dark contrast the card has while live.
  const isWinningTeam = (teamName) =>
    match.status === "COMPLETED" &&
    Boolean(match.result?.winner) &&
    sameName(teamName, match.result.winner);

  if (isTestMatch(match)) {
    const scheduledCount = getScheduledInningsCount(match);

    // Group by team identity rather than innings index, since follow-on can
    // flip which team bats at index 2 vs 3. Each team gets one row; innings
    // that haven't started yet are simply omitted (no placeholder segment),
    // so a completed innings never gets a dangling "& yet to bat" tacked on.
    const teamOrder = [];
    for (let index = 0; index < scheduledCount; index += 1) {
      const scheduledTeam = getScheduledTeamsForInnings(
        match,
        index,
      ).battingTeam;
      if (!teamOrder.some((team) => sameName(team, scheduledTeam))) {
        teamOrder.push(scheduledTeam);
      }
    }

    return teamOrder.map((teamName) => {
      const rowIsWinner = isWinningTeam(teamName);
      const segments = [];
      for (let index = 0; index < scheduledCount; index += 1) {
        const existing = match.innings[index];
        if (!existing || !sameName(existing.battingTeam, teamName)) continue;
        segments.push({
          innings: existing,
          isCurrent:
            rowIsWinner ||
            (index === currentIndex && match.status !== "COMPLETED"),
        });
      }

      return {
        key: `test-team-${teamName}`,
        label: formatName(teamName),
        segments,
        isCurrent: rowIsWinner || segments.some((segment) => segment.isCurrent),
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
      isCurrent:
        isWinningTeam(teams.battingTeam) ||
        (index === currentIndex && match.status !== "COMPLETED"),
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

  if (currentIndex === 0) {
    const tossWinner = formatName(match.toss?.winner || "");
    const tossDecision = match.toss?.decision === "bowl" ? "bowl" : "bat";

    return {
      type: "inningsInfo",
      crr,
      text: tossWinner
        ? `${tossWinner} elected to ${tossDecision}`
        : "First innings in progress",
    };
  }

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
  if (ball.isWicket || ball.type === "WICKET") {
    if (ball.type === "WIDE" || ball.extra === "WIDE") {
      const wides = Number(ball.runs || 0);
      return { label: wides > 1 ? `${wides}Wd+W` : "Wd+W", kind: "wicket" };
    }
    if (ball.type === "NO_BALL" || ball.extra === "NO_BALL") {
      const automatic = match.rules?.noBall?.extraRun ? 1 : 0;
      const batterRuns = Math.max(0, Number(ball.runs || 0) - automatic);
      return {
        label: batterRuns > 0 ? `Nb+${batterRuns}+W` : "Nb+W",
        kind: "wicket",
      };
    }
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
