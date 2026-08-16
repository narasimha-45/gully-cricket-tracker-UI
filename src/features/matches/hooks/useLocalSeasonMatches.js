import { useCallback, useEffect, useState } from "react";
import { getMatchesBySeason } from "../../../storage/matchDB";
import { logger } from "../../../observability/logger";

export function useLocalSeasonMatches(seasonId) {
  const [state, setState] = useState({ data: [], loading: true, error: null });

  const reload = useCallback(async () => {
    if (!seasonId) return;
    try {
      setState((current) => ({
        ...current,
        loading: current.data.length === 0,
        error: null,
      }));
      const matches = await getMatchesBySeason(seasonId);
      setState({
        data: Array.isArray(matches) ? matches : [],
        loading: false,
        error: null,
      });
    } catch (error) {
      logger.error("matches.local.load.failed", { seasonId, error });
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [seasonId]);

  useEffect(() => {
    reload();
    const refresh = (event) => {
      const changedSeasonId = event.detail?.seasonId;
      if (!changedSeasonId || String(changedSeasonId) === String(seasonId))
        reload();
    };
    window.addEventListener("gully:matches-changed", refresh);
    return () => window.removeEventListener("gully:matches-changed", refresh);
  }, [reload, seasonId]);

  return { ...state, reload };
}
