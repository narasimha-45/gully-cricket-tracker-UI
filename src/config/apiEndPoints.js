const BASE_URL = import.meta.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

export const API_ENDPOINTS = {
    GLOBAL_SEARCH: `${BASE_URL}/api/search`,
    CREATE_SEASON: `${BASE_URL}/seasons/create`,
    GET_SEASONS: `${BASE_URL}/seasons`,
    SEARCH_TEAMS: `${BASE_URL}/teams/search`,
    CREATE_TEAM: `${BASE_URL}/teams/create`,
    SUBMIT_MATCH: `${BASE_URL}/matches/create`,
    SEARCH_PLAYER: `${BASE_URL}/players/search`,
    GET_TEAM_PLAYERS: `${BASE_URL}/teams/season-player`,
    GET_SEASON_MATCHES: `${BASE_URL}/matches/season`,
    GET_MATCH_DETAILS: `${BASE_URL}/matches/details`,
    GET_PLAYER_STATS: `${BASE_URL}/players/stats`,
    GET_BATTING_STATS: `${BASE_URL}/players/batting-stats`,
    BATTING_LEADERBOARD: `${BASE_URL}/stats/leaderboard/batting`,
    BOWLING_LEADERBOARD: `${BASE_URL}/api/stats/leaderboard/bowling`,
    GET_BOWLING_STATS: `${BASE_URL}/players/bowling-stats`,
}