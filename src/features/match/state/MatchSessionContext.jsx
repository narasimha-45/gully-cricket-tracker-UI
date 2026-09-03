import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { matchesApi } from "../../../api/matches";
import { logger } from "../../../observability/logger";
import { getMatch, saveMatch } from "../../../storage/matchDB";
import {
  ensureScorerToken,
} from "../../live/liveMatchTransport";
import { useLiveMatchSocket } from "../../live/useLiveMatchSocket";
import { getMatchInvariantViolations } from "../domain/matchInvariants";
import { MATCH_ACTIONS } from "./matchActions";
import { MatchSessionContext } from "./matchSessionContext";
import { initialMatchSessionState, matchSessionReducer } from "./matchReducer";

const VIEWER_BLOCKED_ACTIONS = new Set([
  MATCH_ACTIONS.SELECT_PLAYER,
  MATCH_ACTIONS.CHANGE_BOWLER,
  MATCH_ACTIONS.SWITCH_STRIKE,
  MATCH_ACTIONS.RETIRE_BATTER,
  MATCH_ACTIONS.SCORE_RUN,
  MATCH_ACTIONS.TAKE_WICKET,
  MATCH_ACTIONS.UNDO,
  MATCH_ACTIONS.START_NEXT_INNINGS,
  MATCH_ACTIONS.START_SUPER_OVER,
  MATCH_ACTIONS.DECLARE_TEST_INNINGS,
  MATCH_ACTIONS.FINISH_TEST_DRAW,
  MATCH_ACTIONS.SET_EXTRA_MODE,
  MATCH_ACTIONS.TOGGLE_EXTRA_MODE,
  MATCH_ACTIONS.REPLACE_MATCH,
  MATCH_ACTIONS.REPLACE_PERSISTED_MATCH,
  MATCH_ACTIONS.UPDATE_SETTINGS,
  MATCH_ACTIONS.ADD_TEAM_PLAYER,
  MATCH_ACTIONS.REMOVE_TEAM_PLAYER,
]);

export function MatchSessionProvider({ matchId, children }) {
  const [state, dispatch] = useReducer(
    matchSessionReducer,
    initialMatchSessionState,
  );
  const hydratedIdRef = useRef(null);

  useEffect(() => {
    let active = true;
    hydratedIdRef.current = null;

    const hydrate = async () => {
      try {
        const storedMatch = await getMatch(matchId);
        if (!active) return;

        if (storedMatch) {
          const ensured = ensureScorerToken(storedMatch);
          if (ensured.changed) await saveMatch(ensured.match);
          if (!active) return;
          hydratedIdRef.current = matchId;
          dispatch({
            type: MATCH_ACTIONS.HYDRATE,
            payload: ensured.match,
            role: "SCORER",
          });
          return;
        }

        const liveResponse = await matchesApi.getLiveMatch(matchId);
        if (!active) return;
        hydratedIdRef.current = matchId;
        dispatch({
          type: MATCH_ACTIONS.HYDRATE,
          payload: liveResponse?.match || null,
          role: "VIEWER",
          remoteRevision: liveResponse?.revision || 0,
        });
      } catch (error) {
        if (!active) return;
        logger.error("match.hydration.failed", { matchId, error });
        dispatch({ type: MATCH_ACTIONS.HYDRATE_FAILED, error });
      }
    };

    hydrate();

    return () => {
      active = false;
    };
  }, [matchId]);

  useEffect(() => {
    if (state.phase !== "ready" || !state.match) return;
    const issues = getMatchInvariantViolations(state.match);
    if (issues.length > 0) {
      logger.warn("match.invariant.violation", {
        matchId: state.match.id,
        revision: state.revision,
        role: state.role,
        issues,
      });
    }
  }, [state.match, state.phase, state.revision, state.role]);

  useEffect(() => {
    if (
      state.role !== "SCORER" ||
      state.phase !== "ready" ||
      !state.match ||
      state.revision === 0 ||
      hydratedIdRef.current !== matchId
    ) {
      return undefined;
    }

    const revision = state.revision;
    const snapshot = state.match;
    let active = true;
    dispatch({ type: MATCH_ACTIONS.PERSISTING, revision });

    saveMatch(snapshot)
      .then(() => {
        if (!active) return;
        dispatch({
          type: MATCH_ACTIONS.PERSISTED,
          revision,
          savedAt: Date.now(),
        });
      })
      .catch((error) => {
        if (!active) return;
        logger.error("match.persistence.failed", {
          matchId: snapshot.id,
          revision,
          error,
        });
        dispatch({ type: MATCH_ACTIONS.PERSIST_FAILED, revision, error });
      });

    return () => {
      active = false;
    };
  }, [matchId, state.match, state.phase, state.revision, state.role]);

  const handleRemoteSnapshot = useCallback((snapshot, remoteRevision) => {
    dispatch({
      type: MATCH_ACTIONS.REMOTE_SNAPSHOT,
      payload: snapshot,
      remoteRevision,
    });
  }, []);

  const handleRemotePatch = useCallback((patch, remoteRevision) => {
    dispatch({
      type: MATCH_ACTIONS.REMOTE_PATCH,
      payload: patch,
      remoteRevision,
    });
  }, []);

  const { connectionState, sendFullSync } = useLiveMatchSocket({
    matchId,
    role: state.role,
    match: state.match,
    enabled: state.phase === "ready" && Boolean(state.match?.live),
    onRemoteSnapshot: handleRemoteSnapshot,
    onRemotePatch: handleRemotePatch,
  });

  const tracedDispatch = useCallback(
    (action) => {
      if (state.role === "VIEWER" && VIEWER_BLOCKED_ACTIONS.has(action?.type)) {
        logger.warn("match.viewer.action.blocked", {
          matchId,
          action: action?.type,
        });
        return;
      }
      logger.debug("match.action.dispatched", {
        matchId,
        action: action?.type,
        role: state.role,
      });
      dispatch(action);
    },
    [matchId, state.role],
  );

  const replaceMatch = useCallback(
    (match, options = {}) => {
      tracedDispatch({
        type: MATCH_ACTIONS.REPLACE_MATCH,
        payload: match,
        extraMode: options.extraMode,
      });
    },
    [tracedDispatch],
  );

  const persistReplacement = useCallback(
    async (match, options = {}) => {
      if (state.role === "VIEWER") {
        throw new Error("Viewers cannot modify a live match");
      }
      const ensured = ensureScorerToken(match);
      await saveMatch(ensured.match);
      tracedDispatch({
        type: MATCH_ACTIONS.REPLACE_PERSISTED_MATCH,
        payload: ensured.match,
        extraMode: options.extraMode,
        savedAt: Date.now(),
      });
      return ensured.match;
    },
    [state.role, tracedDispatch],
  );

  const value = useMemo(
    () => ({
      ...state,
      dispatch: tracedDispatch,
      replaceMatch,
      persistReplacement,
      liveConnectionState: connectionState,
      sendFullLiveSync: sendFullSync,
      isScorer: state.role === "SCORER",
      isViewer: state.role === "VIEWER",
    }),
    [
      state,
      tracedDispatch,
      replaceMatch,
      persistReplacement,
      connectionState,
      sendFullSync,
    ],
  );

  return (
    <MatchSessionContext.Provider value={value}>
      {children}
    </MatchSessionContext.Provider>
  );
}
