import { MATCH_ACTIONS } from "./matchActions";
import {
  addTeamPlayer,
  changeBowler,
  declareTestInnings,
  finishTestAsDraw,
  removeTeamPlayer,
  retireBatter,
  scoreRun,
  selectPlayer,
  startNextInnings,
  startSuperOver,
  switchStrike,
  takeWicket,
  undo,
  updateMatchSettings,
} from "../domain/matchEngine";

export const initialMatchSessionState = Object.freeze({
  phase: "loading",
  match: null,
  extraMode: "NORMAL",
  revision: 0,
  persistence: {
    status: "idle",
    savedAt: null,
    error: null,
  },
  error: null,
});

const commit = (state, nextMatch, extraMode = state.extraMode) => {
  if (!nextMatch || nextMatch === state.match) return state;
  return {
    ...state,
    match: nextMatch,
    extraMode,
    revision: state.revision + 1,
    persistence: {
      ...state.persistence,
      status: "dirty",
      error: null,
    },
  };
};

export function matchSessionReducer(state, action) {
  switch (action.type) {
    case MATCH_ACTIONS.HYDRATE:
      return {
        ...initialMatchSessionState,
        phase: "ready",
        match: action.payload || null,
        extraMode: "NORMAL",
      };

    case MATCH_ACTIONS.HYDRATE_FAILED:
      return {
        ...initialMatchSessionState,
        phase: "error",
        error: action.error || new Error("Unable to load match"),
      };

    case MATCH_ACTIONS.SELECT_PLAYER:
      return commit(
        state,
        selectPlayer(state.match, {
          ...action.payload,
          extraMode: state.extraMode,
        }),
      );

    case MATCH_ACTIONS.CHANGE_BOWLER:
      return commit(
        state,
        changeBowler(state.match, {
          ...action.payload,
          extraMode: state.extraMode,
        }),
      );

    case MATCH_ACTIONS.SWITCH_STRIKE:
      return commit(
        state,
        switchStrike(state.match, { extraMode: state.extraMode }),
      );

    case MATCH_ACTIONS.RETIRE_BATTER:
      return commit(state, retireBatter(state.match, action.payload));

    case MATCH_ACTIONS.SCORE_RUN:
      return commit(
        state,
        scoreRun(state.match, {
          ...action.payload,
          extraMode: state.extraMode,
        }),
        "NORMAL",
      );

    case MATCH_ACTIONS.TAKE_WICKET:
      return commit(
        state,
        takeWicket(state.match, {
          ...action.payload,
          extraMode: state.extraMode,
        }),
        "NORMAL",
      );

    case MATCH_ACTIONS.UNDO: {
      const restored = undo(state.match, action.payload);
      return commit(state, restored.match, restored.extraMode);
    }

    case MATCH_ACTIONS.START_NEXT_INNINGS:
      return commit(state, startNextInnings(state.match, action.payload), "NORMAL");

    case MATCH_ACTIONS.START_SUPER_OVER:
      return commit(state, startSuperOver(state.match), "NORMAL");

    case MATCH_ACTIONS.DECLARE_TEST_INNINGS:
      return commit(state, declareTestInnings(state.match), "NORMAL");

    case MATCH_ACTIONS.FINISH_TEST_DRAW:
      return commit(state, finishTestAsDraw(state.match), "NORMAL");

    case MATCH_ACTIONS.SET_EXTRA_MODE:
      return { ...state, extraMode: action.payload || "NORMAL" };

    case MATCH_ACTIONS.TOGGLE_EXTRA_MODE: {
      const mode = action.payload;
      return {
        ...state,
        extraMode: state.extraMode === mode ? "NORMAL" : mode,
      };
    }

    case MATCH_ACTIONS.REPLACE_MATCH:
      return commit(state, action.payload, action.extraMode ?? state.extraMode);

    case MATCH_ACTIONS.REPLACE_PERSISTED_MATCH:
      if (!action.payload) return state;
      return {
        ...state,
        match: action.payload,
        extraMode: action.extraMode ?? state.extraMode,
        persistence: {
          status: "saved",
          savedAt: action.savedAt || Date.now(),
          error: null,
        },
      };

    case MATCH_ACTIONS.UPDATE_SETTINGS:
      return commit(state, updateMatchSettings(state.match, action.payload));

    case MATCH_ACTIONS.ADD_TEAM_PLAYER:
      return commit(state, addTeamPlayer(state.match, action.payload));

    case MATCH_ACTIONS.REMOVE_TEAM_PLAYER:
      return commit(state, removeTeamPlayer(state.match, action.payload));

    case MATCH_ACTIONS.PERSISTING:
      if (action.revision !== state.revision) return state;
      return {
        ...state,
        persistence: { ...state.persistence, status: "saving", error: null },
      };

    case MATCH_ACTIONS.PERSISTED:
      if (action.revision !== state.revision) return state;
      return {
        ...state,
        persistence: {
          status: "saved",
          savedAt: action.savedAt || Date.now(),
          error: null,
        },
      };

    case MATCH_ACTIONS.PERSIST_FAILED:
      return {
        ...state,
        persistence: {
          ...state.persistence,
          status: "error",
          error: action.error || new Error("Local save failed"),
        },
      };

    default:
      return state;
  }
}
