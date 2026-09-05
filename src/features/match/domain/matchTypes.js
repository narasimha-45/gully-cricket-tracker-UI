/**
 * Central JSDoc shapes for the match domain. Nothing here executes — these
 * typedefs exist purely so editors can autocomplete and flag mismatches
 * when a match/innings/live object is threaded through components, the
 * reducer, and the domain engine. Reference with:
 *
 *   /** @type {import("../domain/matchTypes").Match} *\/
 *
 * Keep this in sync with utils/matchModel.js#createEmptyInnings and the
 * shapes produced by domain/matchCommands.js + domain/scoringEngine.js —
 * those are the source of truth; this file documents them.
 */

/**
 * @typedef {Object} Dismissal
 * @property {string} type - One of BOWLER_WICKETS (see matchPrimitives.js) or a non-bowler wicket type (e.g. RUN_OUT).
 * @property {string|null} bowler
 * @property {string|null} fielder
 */

/**
 * @typedef {Object} BattingStats
 * @property {number} battingPosition
 * @property {number} runs
 * @property {number} balls
 * @property {number} fours
 * @property {number} sixes
 * @property {Dismissal|null} dismissal
 */

/**
 * @typedef {Object} BowlingStats
 * @property {number} balls
 * @property {number} runs
 * @property {number} wickets
 * @property {number} maidens
 */

/**
 * @typedef {Object} BallEvent
 * @property {number} over
 * @property {number} ballInOver
 * @property {number} actualBallNum
 * @property {string} [striker]
 * @property {string} [nonStriker]
 * @property {string} [bowler]
 * @property {number} runs - Total runs added to the team score for this delivery (includes automatic extras).
 * @property {number} [battingRuns] - Runs credited to the batter's own tally (excludes wides, byes, and automatic no-ball extras).
 * @property {"RUN"|"WIDE"|"NO_BALL"|"BYE"|"WICKET"|"RETIRE"} type
 * @property {string} [extra] - Extra mode active when this ball was bowled ("WIDE" | "NO_BALL" | "BYE" | "NORMAL").
 * @property {boolean} [isWicket]
 * @property {{type: string, outBatsman: string, helper: string|null}} [wicket]
 * @property {number} timestamp
 */

/**
 * @typedef {Object} Extras
 * @property {number} wides
 * @property {number} noBalls
 * @property {number} byes
 */

/**
 * @typedef {Object} Innings
 * @property {string} battingTeam - Normalized (lowercased/trimmed) team name.
 * @property {string} bowlingTeam - Normalized team name.
 * @property {number} inningsNumber - This team's ordinal innings in the match (1 or 2; test follow-on aware).
 * @property {number} totalRuns
 * @property {number} wickets
 * @property {number} balls - Legal deliveries bowled.
 * @property {Object.<string, BattingStats>} battingStats - Keyed by normalized player name.
 * @property {Object.<string, BowlingStats>} bowlingStats - Keyed by normalized player name.
 * @property {Object.<string, Dismissal>} dismissals - Keyed by normalized batter name.
 * @property {BallEvent[]} thisOver - Cleared at the end of every completed over.
 * @property {BallEvent[]} ballByBall - Full delivery-by-delivery log for this innings.
 * @property {Extras} extras
 * @property {boolean} thisOverBowlerChanged
 * @property {boolean} completed
 * @property {boolean} [isSuperOver]
 * @property {string} [completionReason] - e.g. "DECLARED" | "DRAW" | "ALL_OUT" | "OVERS_COMPLETE"
 */

/**
 * @typedef {Object} LiveState
 * @property {number} inningsIndex - Index into match.innings for the innings currently being scored.
 * @property {string|null} striker
 * @property {string|null} nonStriker
 * @property {string|null} bowler
 * @property {string|null} lastOverBowler - Cannot bowl the next over consecutively.
 * @property {string[]} outBatsmen
 * @property {Array} history - Undo snapshot stack (see utils/snapShot.js).
 * @property {boolean} [pendingNextInnings]
 * @property {number|null} [pendingNextInningsIndex]
 * @property {boolean} [pendingSuperOver]
 */

/**
 * @typedef {Object} TeamRef
 * @property {string} name
 * @property {string[]} players - Normalized player names.
 */

/**
 * @typedef {Object} MatchResult
 * @property {string|null} winner - Normalized team name, or null for a draw/tie/incomplete match.
 * @property {string} [wonBy] - Human-readable margin, e.g. "6 wickets" or "24 runs".
 */

/**
 * @typedef {Object} TestConfig
 * @property {1|2} inningsPerTeam
 * @property {boolean} [followOnEnforced]
 */

/**
 * @typedef {Object} MatchRules
 * @property {{extraBall: boolean, extraRun: boolean}} [wide]
 * @property {{extraBall: boolean, extraRun: boolean}} [noBall]
 */

/**
 * @typedef {Object} Match
 * @property {string} id
 * @property {"SETUP"|"LIVE"|"COMPLETED"} status
 * @property {"OVERS"|"TEST"} matchType
 * @property {{teamA: TeamRef, teamB: TeamRef}} teams
 * @property {Innings[]} innings
 * @property {LiveState} live
 * @property {MatchRules} [rules]
 * @property {TestConfig} [testConfig]
 * @property {MatchResult} [result]
 * @property {{matchResultSeen: boolean}} [ui]
 * @property {number} updatedAt - Set by matchPrimitives.js#stamp on every mutation.
 * @property {string} [syncStatus] - "synced" | "pending" | "failed" — local persistence/sync state, not server truth.
 */

export {};
