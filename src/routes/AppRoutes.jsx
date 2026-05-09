import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";


import AppShell from "../components/AppShell";
import Home from "../pages/Home";
import styles from "../pages/Home.module.css";
import SeasonLayout from "../pages/SeasonLayout";
import SeasonMatches from "../pages/SeasonMatches";
import SeasonStats from "../pages/SeasonStats";
import CreateMatchType from "../pages/CreateMatch";
import { useState } from "react";
import SeasonShell from "../pages/SeasonShell";
import TeamAPlayers from "../pages/TeamAPlayers";
import TeamBPlayers from "../pages/TeamBPlayers";
import TossPage from "../pages/TossPage";
import LiveMatch from "../pages/LiveMatch";
import SelectStriker from "../pages/SelectStriker";
import SeasonBattingStats from "../pages/SeasonBattingStats";
import SeasonBowlingStats from "../pages/SeasonBowlingStats";
import MatchSummary from "../pages/MatchSummary";
import SeasonMiscStats from "../pages/SeasonMiscStats";

export default function AppRoutes() {
  const [openCreateSeason, setOpenCreateSeason] = useState(false);
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
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

        {/* Season (Matches / Stats) */}
        <Route path="/season/:seasonId" element={<SeasonShell />}>
          <Route index element={<Navigate to="matches" replace />} />

          <Route path="" element={<SeasonLayout />}>
            <Route path="matches" element={<SeasonMatches />} />
            <Route path="stats" element={<SeasonStats />}>
              <Route index element={<Navigate to="batting" replace />} />
              <Route path="batting" element={<SeasonBattingStats />} />
              <Route path="bowling" element={<SeasonBowlingStats />} />
              <Route path="misc" element={<SeasonMiscStats />} /> {/* ✅ */}
            </Route>
          </Route>
        </Route>

        {/* Create Match Flow */}
        <Route
          path="/season/:seasonId/create-match"
          element={
            <AppShell title="Gully Cricket">
              <CreateMatchType />
            </AppShell>
          }
        />

        {/* MATCH SETUP FLOW */}
        {/* <Route
          path="/season/:seasonId/match/:matchId/setup"
          element={
            <AppShell title="Gully Cricket">
              <Navigate to="team-a" replace />
            </AppShell>
          }
        /> */}
        <Route
          path="/season/:seasonId/match/:matchId"
          element={
            <AppShell title="Gully Cricket">
              <MatchSummary />
            </AppShell>
          }
        />
        <Route
          path="/season/:seasonId/match/:matchId/setup/team-a"
          element={
            <AppShell title="Gully Cricket">
              <TeamAPlayers />
            </AppShell>
          }
        />

        <Route
          path="/season/:seasonId/match/:matchId/setup/team-b"
          element={
            <AppShell title="Gully Cricket">
              <TeamBPlayers />
            </AppShell>
          }
        />

        <Route
          path="/season/:seasonId/match/:matchId/toss"
          element={
            <AppShell title="Gully Cricket">
              <TossPage />
            </AppShell>
          }
        />

        <Route
          path="/season/:seasonId/match/:matchId/live"
          element={
            <AppShell title="Gully Cricket">
              <LiveMatch />
            </AppShell>
          }
        />

        <Route
          path="/season/:seasonId/match/:matchId/live/select-striker"
          element={
            <AppShell title="Select Striker">
              <SelectStriker />
            </AppShell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
