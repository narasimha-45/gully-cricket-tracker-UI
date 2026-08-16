export const LEADERBOARD_ACTIONS = Object.freeze({
  OPEN_FILTERS: "leaderboard/openFilters",
  CLOSE_FILTERS: "leaderboard/closeFilters",
  APPLY_FILTERS: "leaderboard/applyFilters",
  RESET_TEAM_FILTERS: "leaderboard/resetTeamFilters",
  SORT: "leaderboard/sort",
});

export function createLeaderboardState(defaultFilters, defaultSortKey) {
  return {
    filters: defaultFilters,
    sortKey: defaultSortKey,
    sortDir: "desc",
    filtersOpen: false,
  };
}

export function leaderboardReducer(state, action) {
  switch (action.type) {
    case LEADERBOARD_ACTIONS.OPEN_FILTERS:
      return { ...state, filtersOpen: true };
    case LEADERBOARD_ACTIONS.CLOSE_FILTERS:
      return { ...state, filtersOpen: false };
    case LEADERBOARD_ACTIONS.APPLY_FILTERS:
      return { ...state, filters: action.payload || state.filters };
    case LEADERBOARD_ACTIONS.RESET_TEAM_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          teamId: "All",
          opponentTeamId: "All",
        },
      };
    case LEADERBOARD_ACTIONS.SORT:
      return state.sortKey === action.payload
        ? { ...state, sortDir: state.sortDir === "asc" ? "desc" : "asc" }
        : { ...state, sortKey: action.payload, sortDir: "desc" };
    default:
      return state;
  }
}
