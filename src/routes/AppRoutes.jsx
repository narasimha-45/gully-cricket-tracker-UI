import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import AppShell from "../components/AppShell";
import Home from "../pages/Home";
import styles from "../pages/Home.module.css";
import SeasonShell from "../pages/SeasonShell";
import SeasonLayout from "../pages/SeasonLayout";
import SeasonMatches from "../pages/SeasonMatches";
import SeasonStats from "../pages/SeasonStats";
import BattingStats from "../pages/BattingStats";
import BowlingStats from "../pages/BowlingStats";
import MiscStats from "../pages/MiscStats";
import { SeasonStatsProvider } from "../context/SeasonStatsContext";
import InsightsHub from "../pages/InsightsHub";
import TeamStats from "../pages/TeamStats";
import MatchupsPlaceholder from "../pages/MatchupsPlaceholder";
import PlayerProfilePlaceholder from "../pages/PlayerProfilePlaceholder";
import TeamProfilePlaceholder from "../pages/TeamProfilePlaceholder";
import CreateMatchType from "../pages/CreateMatch";
import TeamAPlayers from "../pages/TeamAPlayers";
import TeamBPlayers from "../pages/TeamBPlayers";
import TossPage from "../pages/TossPage";
import LiveMatch from "../pages/LiveMatch";
import MatchSummary from "../pages/MatchSummary";
import AnalyticsOverview from "../pages/AnalyticsOverview";

export default function AppRoutes() {
  const [openCreateSeason, setOpenCreateSeason] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        {/* ================= HOME ================= */}

        <Route
          path="/"
          element={
            <AppShell
              title="Gully Cricket"
              bottomAction={
                <button
                  className={styles.createBtn}
                  onClick={() => setOpenCreateSeason(true)}
                >
                  + Create Season
                </button>
              }
            >
              <Home
                open={openCreateSeason}
                onClose={() => setOpenCreateSeason(false)}
              />
            </AppShell>
          }
        />

        {/* ================= GLOBAL INSIGHTS HUB ================= */}

        <Route
          path="/insights"
          element={
            <SeasonStatsProvider>
              <AppShell title="Gully Cricket">
                <InsightsHub />
              </AppShell>
            </SeasonStatsProvider>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />

          <Route path="overview" element={<AnalyticsOverview />} />

          <Route path="batting" element={<BattingStats isOverall />} />

          <Route path="bowling" element={<BowlingStats isOverall />} />

          <Route path="teams" element={<TeamStats />} />

          <Route path="misc" element={<MiscStats isOverall />} />

          <Route path="matchups" element={<MatchupsPlaceholder />} />
        </Route>

        {/* ================= PROFILES ================= */}
        
        <Route
          path="/player/:id"
          element={
            <AppShell title="Gully Cricket">
              <PlayerProfilePlaceholder />
            </AppShell>
          }
        />

        <Route
          path="/team/:id"
          element={
            <AppShell title="Gully Cricket">
              <TeamProfilePlaceholder />
            </AppShell>
          }
        />

        {/* ================= SEASON ================= */}

        <Route path="/season/:seasonId" element={<SeasonShell />}>
          <Route index element={<Navigate to="matches" replace />} />

          <Route path="" element={<SeasonLayout />}>
            {/* MATCHES */}
            <Route path="matches" element={<SeasonMatches />} />

            {/* STATS */}
            <Route
              path="stats"
              element={
                <SeasonStatsProvider>
                  <SeasonStats />
                </SeasonStatsProvider>
              }
            >
              <Route index element={<Navigate to="overview" replace />} />

              <Route path="overview" element={<AnalyticsOverview />} />

              <Route path="batting" element={<BattingStats />} />

              <Route path="bowling" element={<BowlingStats />} />

              <Route path="teams" element={<TeamStats />} />

              <Route path="misc" element={<MiscStats />} />

              <Route path="matchups" element={<MatchupsPlaceholder />} />
            </Route>
          </Route>
        </Route>

        {/* ================= CREATE MATCH ================= */}

        <Route
          path="/season/:seasonId/create-match"
          element={
            <AppShell title="Cricora">
              <CreateMatchType />
            </AppShell>
          }
        />

        {/* ================= MATCH SUMMARY ================= */}

        <Route
          path="/season/:seasonId/match/:matchId"
          element={
            <AppShell title="Cricora">
              <MatchSummary />
            </AppShell>
          }
        />

        {/* ================= TEAM A ================= */}

        <Route
          path="/season/:seasonId/match/:matchId/setup/team-a"
          element={
            <AppShell title="Cricora">
              <TeamAPlayers />
            </AppShell>
          }
        />

        {/* ================= TEAM B ================= */}

        <Route
          path="/season/:seasonId/match/:matchId/setup/team-b"
          element={
            <AppShell title="Cricora">
              <TeamBPlayers />
            </AppShell>
          }
        />

        {/* ================= TOSS ================= */}

        <Route
          path="/season/:seasonId/match/:matchId/setup/toss"
          element={
            <AppShell title="Cricora">
              <TossPage />
            </AppShell>
          }
        />

        {/* ================= LIVE MATCH ================= */}

        <Route
          path="/season/:seasonId/match/:matchId/live"
          element={
            <AppShell title="Cricora">
              <LiveMatch />
            </AppShell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
