import { useEffect, useMemo, useState } from "react";

import { api } from "../api";
import { formatName } from "../utils/helpers";

function normalizeTeamOptions(response) {
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : [];

  const uniqueTeams = new Map();

  rows.forEach((team) => {
    const value = team.teamId ?? team.id;
    const teamName = team.teamName ?? team.name;

    if (!value || !teamName || uniqueTeams.has(value)) return;

    uniqueTeams.set(value, {
      value,
      label: formatName(teamName),
    });
  });

  return [...uniqueTeams.values()].sort((left, right) =>
    left.label.localeCompare(right.label)
  );
}

export function useLeaderboardTeams({ seasonId, isOverall, globalFilter }) {
  const requestedSeasonId = useMemo(() => {
    if (!isOverall) return seasonId || "ALL";

    return globalFilter && globalFilter !== "all"
      ? globalFilter
      : "ALL";
  }, [globalFilter, isOverall, seasonId]);

  const [teamOptions, setTeamOptions] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamError, setTeamError] = useState("");

  useEffect(() => {
    let isCurrentRequest = true;

    async function loadTeams() {
      try {
        setLoadingTeams(true);
        setTeamError("");

        const response = await api.teams.getTeams(requestedSeasonId);

        if (!isCurrentRequest) return;
        setTeamOptions(normalizeTeamOptions(response));
      } catch (error) {
        if (!isCurrentRequest) return;

        console.error("Failed to load leaderboard teams:", error);
        setTeamOptions([]);
        setTeamError("Unable to load teams.");
      } finally {
        if (isCurrentRequest) setLoadingTeams(false);
      }
    }

    loadTeams();

    return () => {
      isCurrentRequest = false;
    };
  }, [requestedSeasonId]);

  return {
    requestedSeasonId,
    teamOptions,
    loadingTeams,
    teamError,
  };
}
