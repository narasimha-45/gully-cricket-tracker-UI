export const buildBattingEndpoint = ({
  API,
  isOverall,
  globalFilter,
  seasonId,
  filters,
}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (
      value &&
      value !== "All"
    ) {
      params.append(
        key,
        value.toLowerCase()
      );
    }
  });

  const query = params.toString();

  let endpoint = "";

  if (isOverall) {
    endpoint =
      globalFilter === "all"
        ? `${API}/api/stats/leaderboard/batting`
        : `${API}/api/stats/leaderboard/batting/${globalFilter}`;
  } else {
    endpoint = `${API}/api/stats/leaderboard/batting/${seasonId}`;
  }

  return query
    ? `${endpoint}?${query}`
    : endpoint;
};