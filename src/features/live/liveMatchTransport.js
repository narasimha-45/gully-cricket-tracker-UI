import { BASE_URL } from "../../api";

const SCORER_TOKEN_KEY = "scorerToken";

const clone = (value) => {
  if (value === undefined) return undefined;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const withoutBallHistory = (innings = {}) => {
  const { ballByBall: _ballByBall, ...summary } = innings;
  return clone(summary);
};

const publicLive = (live = {}) => {
  const { history: _history, ...safeLive } = live || {};
  return clone(safeLive);
};

export function getScorerToken(match) {
  return match?.liveScoring?.[SCORER_TOKEN_KEY] || null;
}

export function ensureScorerToken(match) {
  if (!match) return { match, changed: false };
  if (getScorerToken(match)) return { match, changed: false };

  const token =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    changed: true,
    match: {
      ...match,
      liveScoring: {
        ...(match.liveScoring || {}),
        [SCORER_TOKEN_KEY]: token,
      },
      updatedAt: Date.now(),
    },
  };
}

export function buildPublicLiveSnapshot(match) {
  if (!match) return null;
  const {
    liveScoring: _liveScoring,
    syncStatus: _syncStatus,
    lastSyncError: _lastSyncError,
    lastSyncAttemptAt: _lastSyncAttemptAt,
    ui: _ui,
    ...safeMatch
  } = match;

  return {
    ...clone(safeMatch),
    live: publicLive(match.live),
    innings: (match.innings || []).map((innings) => clone(innings)),
  };
}

function makeBallDelta(previousInnings, currentInnings, inningsIndex) {
  const previousBalls = previousInnings?.ballByBall || [];
  const currentBalls = currentInnings?.ballByBall || [];
  const truncateTo = Math.min(previousBalls.length, currentBalls.length);

  return {
    inningsIndex,
    truncateTo,
    append: clone(currentBalls.slice(truncateTo)),
  };
}

export function buildLivePatch(previousMatch, currentMatch) {
  if (!currentMatch) return null;

  const previousIndex = Number(previousMatch?.live?.inningsIndex ?? -1);
  const currentIndex = Number(currentMatch?.live?.inningsIndex ?? 0);
  const currentInnings = currentMatch.innings?.[currentIndex] || null;
  const previousInnings =
    previousIndex === currentIndex
      ? previousMatch?.innings?.[currentIndex] || null
      : null;

  const topLevel = {
    status: currentMatch.status,
    updatedAt: currentMatch.updatedAt,
    matchType: currentMatch.matchType,
    totalOvers: currentMatch.totalOvers,
    testConfig: clone(currentMatch.testConfig ?? null),
    rules: clone(currentMatch.rules ?? null),
    toss: clone(currentMatch.toss ?? null),
    teams: clone(currentMatch.teams ?? null),
    result: clone(currentMatch.result ?? null),
    fieldingStats: clone(currentMatch.fieldingStats ?? null),
  };

  return {
    topLevel,
    live: publicLive(currentMatch.live),
    innings: (currentMatch.innings || []).map((innings, index) => ({
      inningsIndex: index,
      summary: withoutBallHistory(innings),
    })),
    ballDelta: currentInnings
      ? makeBallDelta(previousInnings, currentInnings, currentIndex)
      : null,
  };
}

export function applyLivePatch(match, patch) {
  if (!match || !patch) return match;
  const next = clone(match);

  Object.entries(patch.topLevel || {}).forEach(([key, value]) => {
    next[key] = clone(value);
  });

  if (patch.live) {
    next.live = clone(patch.live);
  }

  next.innings ||= [];
  const inningsPatches = patch.innings || [];
  inningsPatches.forEach(({ inningsIndex, summary }) => {
    const index = Number(inningsIndex);
    if (!Number.isInteger(index) || index < 0) return;
    const current = next.innings[index] || {};
    next.innings[index] = {
      ...clone(summary || {}),
      ballByBall: clone(current.ballByBall || []),
    };
  });
  if (Array.isArray(patch.innings)) {
    next.innings = next.innings.slice(0, patch.innings.length);
  }

  const ballDelta = patch.ballDelta;
  if (ballDelta) {
    const index = Number(ballDelta.inningsIndex);
    const innings = next.innings[index];
    if (innings) {
      const existing = Array.isArray(innings.ballByBall)
        ? innings.ballByBall
        : [];
      const truncateTo = Math.max(
        0,
        Math.min(Number(ballDelta.truncateTo ?? existing.length), existing.length),
      );
      innings.ballByBall = [
        ...existing.slice(0, truncateTo),
        ...clone(ballDelta.append || []),
      ];
    }
  }

  return next;
}

export function createLiveWebSocketUrl(matchId) {
  const base = BASE_URL.startsWith("http")
    ? BASE_URL
    : `${window.location.origin}${BASE_URL.startsWith("/") ? "" : "/"}${BASE_URL}`;
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/ws/live-matches`;
  url.search = "";
  url.searchParams.set("matchId", matchId);
  return url.toString();
}
