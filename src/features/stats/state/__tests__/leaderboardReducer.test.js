import { describe, expect, it } from "vitest";
import {
  LEADERBOARD_ACTIONS,
  createLeaderboardState,
  leaderboardReducer,
} from "../leaderboardReducer";

describe("leaderboardReducer", () => {
  const defaults = { teamId: "All", opponentTeamId: "All", result: "All" };

  it("keeps filter and sorting transitions deterministic", () => {
    let state = createLeaderboardState(defaults, "runs");
    state = leaderboardReducer(state, {
      type: LEADERBOARD_ACTIONS.APPLY_FILTERS,
      payload: { ...defaults, teamId: "team-1" },
    });
    state = leaderboardReducer(state, {
      type: LEADERBOARD_ACTIONS.SORT,
      payload: "average",
    });

    expect(state.filters.teamId).toBe("team-1");
    expect(state.sortKey).toBe("average");
    expect(state.sortDir).toBe("desc");

    state = leaderboardReducer(state, {
      type: LEADERBOARD_ACTIONS.SORT,
      payload: "average",
    });
    expect(state.sortDir).toBe("asc");
  });

  it("resets only team-dependent filters when the selected season changes", () => {
    const initial = {
      ...createLeaderboardState(defaults, "runs"),
      filters: {
        teamId: "team-1",
        opponentTeamId: "team-2",
        result: "Won",
      },
    };

    const next = leaderboardReducer(initial, {
      type: LEADERBOARD_ACTIONS.RESET_TEAM_FILTERS,
    });

    expect(next.filters.teamId).toBe("All");
    expect(next.filters.opponentTeamId).toBe("All");
    expect(next.filters.result).toBe("Won");
  });
});
