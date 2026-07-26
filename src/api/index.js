import { matchesApi } from "./matches";
import { seasonsApi } from "./seasons";
import { playersApi } from "./players";
import { teamsApi } from "./teams";
import { searchApi } from "./search";
import { statsApi } from "./stats";

export {
  ApiError,
  BASE_URL,
  getApiMessage,
  unwrapApiData,
} from "./client";

export const api = {
  matches: matchesApi,
  seasons: seasonsApi,
  players: playersApi,
  teams: teamsApi,
  search: searchApi,
  stats: statsApi,
};
