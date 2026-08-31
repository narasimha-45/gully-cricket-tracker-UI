import { describe, expect, it } from "vitest";
import { buildMatchSyncPayload } from "../matchSyncPayload";

describe("buildMatchSyncPayload", () => {
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
});

describe("Test match sync metadata", () => {
  it("keeps declaration, follow-on and per-team innings numbers in the API payload", () => {
    const payload = buildMatchSyncPayload({
      seasonId: "season-test",
      matchType: "TEST",
      totalOvers: null,
      testConfig: { inningsPerTeam: 2, followOnEnforced: true },
      teams: {
        teamA: { name: "eagles", players: ["alice", "amy"] },
        teamB: { name: "spiders", players: ["bob", "ben"] },
      },
      toss: { winner: "eagles", decision: "bat" },
      rules: {},
      innings: [
        {
          battingTeam: "eagles",
          bowlingTeam: "spiders",
          inningsNumber: 1,
          totalRuns: 150,
          wickets: 1,
          balls: 120,
          battingStats: {},
          bowlingStats: {},
          completionReason: "DECLARED",
          completed: true,
        },
        {
          battingTeam: "spiders",
          bowlingTeam: "eagles",
          inningsNumber: 1,
          totalRuns: 70,
          wickets: 1,
          balls: 90,
          battingStats: {},
          bowlingStats: {},
          completionReason: "ALL_OUT",
          completed: true,
        },
        {
          battingTeam: "spiders",
          bowlingTeam: "eagles",
          inningsNumber: 2,
          totalRuns: 100,
          wickets: 1,
          balls: 100,
          battingStats: {},
          bowlingStats: {},
          isFollowOn: true,
          completionReason: "ALL_OUT",
          completed: true,
        },
      ],
      result: { winner: "eagles", type: "INNINGS", margin: 20 },
    });

    expect(payload.testConfig).toEqual({
      inningsPerTeam: 2,
      followOnEnforced: true,
    });
    expect(payload.innings[0].completionReason).toBe("DECLARED");
    expect(payload.innings[2].isFollowOn).toBe(true);
    expect(payload.innings[2].inningsNumber).toBe(2);
  });
});
