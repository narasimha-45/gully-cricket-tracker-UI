import { describe, expect, it } from "vitest";
import {
  applyLivePatch,
  buildLivePatch,
  buildPublicLiveSnapshot,
} from "../liveMatchTransport";

const baseMatch = () => ({
  id: "match-1",
  seasonId: "season-1",
  status: "LIVE",
  matchType: "OVERS",
  totalOvers: 20,
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
      totalRuns: 0,
      wickets: 0,
      balls: 0,
      battingStats: {},
      bowlingStats: {},
      dismissals: {},
      thisOver: [],
      ballByBall: [],
      extras: { wides: 0, noBalls: 0 },
      completed: false,
    },
  ],
  live: {
    inningsIndex: 0,
    striker: "alice",
    nonStriker: "amy",
    bowler: "bob",
    outBatsmen: [],
    history: [{ secretUndoState: true }],
  },
  liveScoring: { scorerToken: "secret-token" },
  syncStatus: "local",
  updatedAt: 1,
});

describe("live match transport", () => {
  it("never exposes scorer token or undo history in the public snapshot", () => {
    const snapshot = buildPublicLiveSnapshot(baseMatch());

    expect(snapshot).not.toHaveProperty("liveScoring");
    expect(snapshot).not.toHaveProperty("syncStatus");
    expect(snapshot.live).not.toHaveProperty("history");
  });

  it("appends only new balls while keeping viewer state complete", () => {
    const previous = baseMatch();
    const current = structuredClone(previous);
    current.updatedAt = 2;
    current.innings[0].totalRuns = 4;
    current.innings[0].balls = 1;
    current.innings[0].thisOver = [{ type: "RUN", runs: 4, bowler: "bob" }];
    current.innings[0].ballByBall.push({
      over: 0,
      ballInOver: 1,
      striker: "alice",
      bowler: "bob",
      runs: 4,
      type: "RUN",
    });

    const patch = buildLivePatch(previous, current);
    expect(patch.ballDelta.truncateTo).toBe(0);
    expect(patch.ballDelta.append).toHaveLength(1);

    const viewer = buildPublicLiveSnapshot(previous);
    const updatedViewer = applyLivePatch(viewer, patch);
    expect(updatedViewer.innings[0].totalRuns).toBe(4);
    expect(updatedViewer.innings[0].ballByBall).toHaveLength(1);
  });

  it("truncates ball history on undo", () => {
    const previous = baseMatch();
    previous.innings[0].totalRuns = 5;
    previous.innings[0].balls = 2;
    previous.innings[0].ballByBall = [
      { runs: 1, type: "RUN" },
      { runs: 4, type: "RUN" },
    ];

    const current = structuredClone(previous);
    current.updatedAt = 3;
    current.innings[0].totalRuns = 1;
    current.innings[0].balls = 1;
    current.innings[0].ballByBall = [{ runs: 1, type: "RUN" }];

    const patch = buildLivePatch(previous, current);
    const viewer = buildPublicLiveSnapshot(previous);
    const updatedViewer = applyLivePatch(viewer, patch);

    expect(patch.ballDelta.truncateTo).toBe(1);
    expect(patch.ballDelta.append).toHaveLength(0);
    expect(updatedViewer.innings[0].ballByBall).toEqual([
      { runs: 1, type: "RUN" },
    ]);
    expect(updatedViewer.innings[0].totalRuns).toBe(1);
  });

  it("removes a later innings when undo returns to the prior innings", () => {
    const previous = baseMatch();
    previous.innings.push({
      battingTeam: "spiders",
      bowlingTeam: "eagles",
      inningsNumber: 1,
      totalRuns: 0,
      wickets: 0,
      balls: 0,
      battingStats: {},
      bowlingStats: {},
      dismissals: {},
      thisOver: [],
      ballByBall: [],
      extras: { wides: 0, noBalls: 0 },
      completed: false,
    });
    previous.live.inningsIndex = 1;

    const current = baseMatch();
    current.updatedAt = 4;
    current.live.inningsIndex = 0;

    const updatedViewer = applyLivePatch(
      buildPublicLiveSnapshot(previous),
      buildLivePatch(previous, current),
    );

    expect(updatedViewer.innings).toHaveLength(1);
    expect(updatedViewer.live.inningsIndex).toBe(0);
  });
});
