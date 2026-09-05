import { describe, expect, it } from "vitest";
import { MATCH_ACTIONS } from "../../state/matchActions";
import { initialMatchSessionState, matchSessionReducer } from "../../state/matchReducer";
import { createEmptyInnings } from "../../../../utils/matchModel";

function createMatch() {
  return {
    id: "local-test-match",
    seasonId: "season-1",
    status: "LIVE",
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
    innings: [
      createEmptyInnings({
        battingTeam: "eagles",
        bowlingTeam: "warriors",
        inningsNumber: 1,
      }),
    ],
    live: {
      inningsIndex: 0,
      striker: "alice",
      nonStriker: "amy",
      bowler: "bob",
      outBatsmen: [],
      lastOverBowler: null,
      history: [],
      pendingNextInnings: false,
      pendingNextInningsIndex: null,
      pendingSuperOver: false,
    },
  };
}

function hydrate(match = createMatch()) {
  return matchSessionReducer(initialMatchSessionState, {
    type: MATCH_ACTIONS.HYDRATE,
    payload: match,
  });
}

describe("matchSessionReducer", () => {
  it("applies rapid scoring actions against the latest reducer state", () => {
    let state = hydrate();
    state = matchSessionReducer(state, { type: MATCH_ACTIONS.SCORE_RUN, payload: { runs: 1 } });
    state = matchSessionReducer(state, { type: MATCH_ACTIONS.SCORE_RUN, payload: { runs: 2 } });

    expect(state.match.innings[0].totalRuns).toBe(3);
    expect(state.match.innings[0].balls).toBe(2);
    expect(state.match.innings[0].ballByBall).toHaveLength(2);
  });

  it("records a no-ball without consuming a legal delivery", () => {
    let state = hydrate();
    state = matchSessionReducer(state, { type: MATCH_ACTIONS.SET_EXTRA_MODE, payload: "NO_BALL" });
    state = matchSessionReducer(state, { type: MATCH_ACTIONS.SCORE_RUN, payload: { runs: 4 } });

    expect(state.match.innings[0].totalRuns).toBe(5);
    expect(state.match.innings[0].balls).toBe(0);
    expect(state.match.innings[0].battingStats.alice.runs).toBe(4);
    expect(state.match.innings[0].extras.noBalls).toBe(1);
    expect(state.extraMode).toBe("NORMAL");
  });


  it("records byes as team extras, a batter dot, and no bowler runs", () => {
    let state = hydrate();
    state = matchSessionReducer(state, { type: MATCH_ACTIONS.SET_EXTRA_MODE, payload: "BYE" });
    state = matchSessionReducer(state, { type: MATCH_ACTIONS.SCORE_RUN, payload: { runs: 2 } });

    const innings = state.match.innings[0];
    expect(innings.totalRuns).toBe(2);
    expect(innings.balls).toBe(1);
    expect(innings.extras.byes).toBe(2);
    expect(innings.battingStats.alice.runs).toBe(0);
    expect(innings.battingStats.alice.balls).toBe(1);
    expect(innings.bowlingStats.bob.runs).toBe(0);
    expect(innings.bowlingStats.bob.balls).toBe(1);
    expect(innings.ballByBall[0].type).toBe("BYE");
    expect(innings.ballByBall[0].battingRuns).toBe(0);
    expect(state.extraMode).toBe("NORMAL");
  });

  it("keeps no-ball run-out as a NO_BALL event and does not credit the bowler", () => {
    let state = hydrate();
    state = matchSessionReducer(state, { type: MATCH_ACTIONS.SET_EXTRA_MODE, payload: "NO_BALL" });
    state = matchSessionReducer(state, {
      type: MATCH_ACTIONS.TAKE_WICKET,
      payload: { wicketType: "RUN_OUT", outBatsman: "amy", helper: "ben", runs: 1 },
    });

    const innings = state.match.innings[0];
    expect(innings.ballByBall[0].type).toBe("NO_BALL");
    expect(innings.ballByBall[0].isWicket).toBe(true);
    expect(innings.balls).toBe(0);
    expect(innings.bowlingStats.bob.wickets).toBe(0);
  });

  it("undo restores the previous score and delivery count", () => {
    let state = hydrate();
    state = matchSessionReducer(state, { type: MATCH_ACTIONS.SCORE_RUN, payload: { runs: 6 } });
    state = matchSessionReducer(state, { type: MATCH_ACTIONS.UNDO });

    expect(state.match.innings[0].totalRuns).toBe(0);
    expect(state.match.innings[0].balls).toBe(0);
    expect(state.match.innings[0].ballByBall).toHaveLength(0);
  });
});

it("keeps the same striker after an odd run completes the over", () => {
  let state = hydrate();
  const startingStriker = state.match.live.striker;

  for (let ball = 0; ball < 5; ball += 1) {
    state = matchSessionReducer(state, {
      type: MATCH_ACTIONS.SCORE_RUN,
      payload: { runs: 0 },
    });
  }

  state = matchSessionReducer(state, {
    type: MATCH_ACTIONS.SCORE_RUN,
    payload: { runs: 1 },
  });

  expect(state.match.innings[0].balls).toBe(6);
  expect(state.match.live.striker).toBe(startingStriker);
  expect(state.match.live.bowler).toBeNull();
});

it("uses a null winner for a tied completed result so backend validation succeeds", () => {
  const match = createMatch();
  match.totalOvers = 1;
  match.innings[0].totalRuns = 1;
  match.innings[0].balls = 6;
  match.innings[0].completed = true;
  match.innings.push(
    createEmptyInnings({
      battingTeam: "warriors",
      bowlingTeam: "eagles",
      inningsNumber: 1,
    }),
  );
  match.live.inningsIndex = 1;
  match.live.striker = "bob";
  match.live.nonStriker = "ben";
  match.live.bowler = "alice";
  match.innings[1].totalRuns = 1;
  match.innings[1].balls = 5;

  let state = hydrate(match);
  state = matchSessionReducer(state, {
    type: MATCH_ACTIONS.SCORE_RUN,
    payload: { runs: 0 },
  });

  // A tied limited-overs innings queues a super over rather than prematurely
  // posting an invalid pseudo-team winner to the API.
  expect(state.match.live.pendingSuperOver).toBe(true);
  expect(state.match.result).toBeUndefined();
});

it("credits a legal bowler wicket and consumes one legal delivery", () => {
  let state = hydrate();
  state = matchSessionReducer(state, {
    type: MATCH_ACTIONS.TAKE_WICKET,
    payload: { wicketType: "BOWLED", outBatsman: "alice" },
  });

  const innings = state.match.innings[0];
  expect(innings.wickets).toBe(1);
  expect(innings.balls).toBe(1);
  expect(innings.bowlingStats.bob.wickets).toBe(1);
  expect(innings.battingStats.alice.dismissal.type).toBe("BOWLED");
});

it("finishes a chase immediately when the target is reached", () => {
  const match = createMatch();
  match.innings[0].totalRuns = 5;
  match.innings[0].balls = 12;
  match.innings[0].completed = true;
  match.innings.push(
    createEmptyInnings({
      battingTeam: "warriors",
      bowlingTeam: "eagles",
      inningsNumber: 1,
    }),
  );
  match.live.inningsIndex = 1;
  match.live.striker = "bob";
  match.live.nonStriker = "ben";
  match.live.bowler = "alice";
  match.innings[1].totalRuns = 5;

  let state = hydrate(match);
  state = matchSessionReducer(state, {
    type: MATCH_ACTIONS.SCORE_RUN,
    payload: { runs: 1 },
  });

  expect(state.match.status).toBe("COMPLETED");
  expect(state.match.result.winner).toBe("warriors");
  expect(state.match.result.type).toBe("WICKETS");
});

it("can end a Test match as a draw without inventing a winner", () => {
  const match = createMatch();
  match.matchType = "TEST";
  match.totalOvers = null;
  match.testConfig = { inningsPerTeam: 2 };

  let state = hydrate(match);
  state = matchSessionReducer(state, {
    type: MATCH_ACTIONS.FINISH_TEST_DRAW,
  });

  expect(state.match.status).toBe("COMPLETED");
  expect(state.match.result).toEqual({ winner: null, type: "DRAW", margin: 0 });
});
