import { MATCH_TYPES, normalizeName } from "../utils/matchModel";

export const CURRENT_MATCH_SCHEMA_VERSION = 3;

const normalizeRules = (rules = {}) => ({
  wide: {
    extraRun: Boolean(rules?.wide?.extraRun),
    extraBall: rules?.wide?.extraBall !== false,
  },
  noBall: {
    extraRun: rules?.noBall?.extraRun !== false,
    extraBall: rules?.noBall?.extraBall !== false,
  },
});

const normalizeInnings = (innings = {}, index = 0) => ({
  ...innings,
  battingTeam: normalizeName(innings.battingTeam),
  bowlingTeam: normalizeName(innings.bowlingTeam),
  inningsNumber: Number(innings.inningsNumber || index + 1),
  totalRuns: Number(innings.totalRuns ?? innings.score ?? 0),
  wickets: Number(innings.wickets || 0),
  balls: Number(innings.balls || 0),
  battingStats: innings.battingStats || {},
  bowlingStats: innings.bowlingStats || {},
  dismissals: innings.dismissals || {},
  thisOver: Array.isArray(innings.thisOver) ? innings.thisOver : [],
  ballByBall: Array.isArray(innings.ballByBall) ? innings.ballByBall : [],
  extras: {
    wides: Number(innings.extras?.wides || 0),
    noBalls: Number(innings.extras?.noBalls || 0),
  },
  thisOverBowlerChanged: Boolean(innings.thisOverBowlerChanged),
  completed: Boolean(innings.completed),
  ...(innings.isSuperOver ? { isSuperOver: true } : {}),
});

/**
 * Boundary migration for durable device data. Reducers only receive the
 * current domain shape, regardless of which frontend version saved the match.
 */
export function migrateStoredMatch(value) {
  if (!value || typeof value !== "object") return value;

  const now = Date.now();
  const teams = value.teams || {};
  const status = String(value.status || "SETUP").toUpperCase();
  const matchType = value.matchType === "LIMITED_OVERS" ? MATCH_TYPES.OVERS : value.matchType;

  return {
    ...value,
    status,
    matchType: matchType || MATCH_TYPES.OVERS,
    rules: normalizeRules(value.rules),
    teams: {
      teamA: {
        ...(teams.teamA || {}),
        name: normalizeName(teams.teamA?.name),
        players: [...new Set((teams.teamA?.players || []).map(normalizeName).filter(Boolean))],
      },
      teamB: {
        ...(teams.teamB || {}),
        name: normalizeName(teams.teamB?.name),
        players: [...new Set((teams.teamB?.players || []).map(normalizeName).filter(Boolean))],
      },
    },
    innings: Array.isArray(value.innings)
      ? value.innings.map(normalizeInnings)
      : [],
    live: value.live
      ? {
          ...value.live,
          inningsIndex: Number(value.live.inningsIndex || 0),
          outBatsmen: Array.isArray(value.live.outBatsmen) ? value.live.outBatsmen : [],
          history: Array.isArray(value.live.history) ? value.live.history : [],
          pendingNextInnings: Boolean(value.live.pendingNextInnings),
          pendingSuperOver: Boolean(value.live.pendingSuperOver),
        }
      : value.live,
    ui: value.ui || {},
    syncStatus: value.syncStatus || (status === "COMPLETED" ? "pending" : "local"),
    createdAt: Number(value.createdAt || now),
    updatedAt: Number(value.updatedAt || value.createdAt || now),
    schemaVersion: CURRENT_MATCH_SCHEMA_VERSION,
  };
}
