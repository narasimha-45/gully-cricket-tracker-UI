import { describe, expect, it } from "vitest";
import { buildMatchSyncPayload } from "../matchSyncPayload";

it("builds the backend match contract without local persistence metadata", () => {
  const payload = buildMatchSyncPayload({
    id: "local-only-id",
    seasonId: "season-1",
    matchType: "OVERS",
    totalOvers: 2,
    rules: {
      wide: { extraRun: true, extraBall: true },
      noBall: { extraRun: true, extraBall: true },
    },
    teams: {
      teamA: { name: "eagles", players: ["alice", "amy"] },
      teamB: { name: "warriors", players: ["bob", "ben"] },
    },
    toss: { winner: "eagles", decision: "bat" },
    innings: [
      {
        battingTeam: "eagles",
        bowlingTeam: "warriors",
        inningsNumber: 1,
        totalRuns: 12,
        wickets: 1,
        balls: 6,
        battingStats: {},
        bowlingStats: {},
        extras: { wides: 1, noBalls: 0 },
        dismissals: {},
        ballByBall: [],
        completed: true,
      },
    ],
    result: { winner: "eagles", type: "RUNS", margin: 2, manOfTheMatch: "alice" },
    syncStatus: "pending",
    updatedAt: 123,
  });

  expect(payload.seasonId).toBe("season-1");
  expect(payload.innings[0].totalRuns).toBe(12);
  expect(payload.result.winner).toBe("eagles");
  expect(payload).not.toHaveProperty("id");
  expect(payload).not.toHaveProperty("syncStatus");
});
