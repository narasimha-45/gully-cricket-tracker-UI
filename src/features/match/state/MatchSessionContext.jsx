import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { getMatch, saveMatch } from "../../../storage/matchDB";
import { logger } from "../../../observability/logger";
import { getMatchInvariantViolations } from "../domain/matchInvariants";
import { MATCH_ACTIONS } from "./matchActions";
import { initialMatchSessionState, matchSessionReducer } from "./matchReducer";

const MatchSessionContext = createContext(null);

export function MatchSessionProvider({ matchId, children }) {
  const [state, dispatch] = useReducer(
    matchSessionReducer,
    initialMatchSessionState,
  );
  const hydratedIdRef = useRef(null);

  useEffect(() => {
    let active = true;
    hydratedIdRef.current = null;

    getMatch(matchId)
      .then((storedMatch) => {
        if (!active) return;
        hydratedIdRef.current = matchId;
        dispatch({ type: MATCH_ACTIONS.HYDRATE, payload: storedMatch || null });
      })
      .catch((error) => {
        if (!active) return;
        logger.error("match.hydration.failed", { matchId, error });
        dispatch({ type: MATCH_ACTIONS.HYDRATE_FAILED, error });
      });

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
        issues,
      });
    }
  }, [state.match, state.phase, state.revision]);

  useEffect(() => {
    if (
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
  }, [matchId, state.match, state.phase, state.revision]);

  const tracedDispatch = useCallback(
    (action) => {
      logger.debug("match.action.dispatched", {
        matchId,
        action: action?.type,
      });
      dispatch(action);
    },
    [matchId],
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
      await saveMatch(match);
      tracedDispatch({
        type: MATCH_ACTIONS.REPLACE_PERSISTED_MATCH,
        payload: match,
        extraMode: options.extraMode,
        savedAt: Date.now(),
      });
      return match;
    },
    [tracedDispatch],
  );

  const value = useMemo(
    () => ({
      ...state,
      dispatch: tracedDispatch,
      replaceMatch,
      persistReplacement,
    }),
    [state, tracedDispatch, replaceMatch, persistReplacement],
  );

  return (
    <MatchSessionContext.Provider value={value}>
      {children}
    </MatchSessionContext.Provider>
  );
}

export function useMatchSession() {
  const context = useContext(MatchSessionContext);
  if (!context) {
    throw new Error("useMatchSession must be used inside MatchSessionProvider");
  }
  return context;
}
