import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "../components/AppShell";
import LoadingState from "../components/common/LoadingState";
import styles from "../pages/Home.module.css";

const Home = lazy(() => import("../pages/Home"));
const SeasonShell = lazy(() => import("../pages/SeasonShell"));
const SeasonLayout = lazy(() => import("../pages/SeasonLayout"));
const SeasonMatches = lazy(() => import("../pages/SeasonMatches"));
const SeasonStats = lazy(() => import("../pages/SeasonStats"));
const BattingStats = lazy(() => import("../pages/BattingStats"));
const BowlingStats = lazy(() => import("../pages/BowlingStats"));
const MiscStats = lazy(() => import("../pages/MiscStats"));
const InsightsHub = lazy(() => import("../pages/InsightsHub"));
const TeamStats = lazy(() => import("../pages/TeamStats"));
const PlayerProfile = lazy(() => import("../pages/PlayerProfile"));
const TeamProfile = lazy(() => import("../pages/TeamProfile"));
const CreateMatch = lazy(() => import("../pages/CreateMatch"));
const TeamPlayers = lazy(() => import("../pages/TeamPlayers"));
const TossPage = lazy(() => import("../pages/TossPage"));
const LiveMatch = lazy(() => import("../pages/LiveMatch"));
const MatchSummary = lazy(() => import("../pages/MatchSummary"));
const AnalyticsOverview = lazy(() => import("../pages/AnalyticsOverview"));
const Partnerships = lazy(() => import("../pages/Partnerships"));
const Rivalry = lazy(() => import("../pages/Rivalry"));

function RouteFallback() {
  return <LoadingState label="Loading screen…" />;
}

function Shell({ children }) {
  return <AppShell title="Gully Cricket">{children}</AppShell>;
}

export default function AppRoutes() {
  const [openCreateSeason, setOpenCreateSeason] = useState(false);

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              <AppShell
                title="Gully Cricket"
                bottomAction={
                  <button
                    type="button"
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

          <Route
            path="/insights"
            element={
              <Shell>
                <InsightsHub />
              </Shell>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<AnalyticsOverview />} />
            <Route path="batting" element={<BattingStats isOverall />} />
            <Route path="bowling" element={<BowlingStats isOverall />} />
            <Route path="teams" element={<TeamStats />} />
            <Route path="misc" element={<MiscStats isOverall />} />
            <Route path="partnerships" element={<Partnerships />} />
            <Route path="rivalry" element={<Rivalry />} />
            {/* Backward-compatible redirect while matchup APIs are not part of the stable backend. */}
            <Route
              path="matchups"
              element={<Navigate to="../overview" replace />}
            />
          </Route>

          <Route
            path="/player/:id"
            element={
              <Shell>
                <PlayerProfile />
              </Shell>
            }
          />
          <Route
            path="/team/:id"
            element={
              <Shell>
                <TeamProfile />
              </Shell>
            }
          />

          <Route path="/season/:seasonId" element={<SeasonShell />}>
            <Route index element={<Navigate to="matches" replace />} />

            <Route element={<SeasonLayout />}>
              <Route path="matches" element={<SeasonMatches />} />

              <Route path="stats" element={<SeasonStats />}>
                <Route index element={<Navigate to="overview" replace />} />

                <Route path="overview" element={<AnalyticsOverview />} />

                <Route path="batting" element={<BattingStats />} />

                <Route path="bowling" element={<BowlingStats />} />

                <Route path="teams" element={<TeamStats />} />

                <Route path="misc" element={<MiscStats />} />

                {/* Same as InsightsHub */}
                <Route path="partnerships" element={<Partnerships />} />

                <Route path="rivalry" element={<Rivalry />} />

                <Route
                  path="matchups"
                  element={<Navigate to="../overview" replace />}
                />
              </Route>
            </Route>
          </Route>

          <Route
            path="/season/:seasonId/create-match"
            element={
              <Shell>
                <CreateMatch />
              </Shell>
            }
          />
          <Route
            path="/season/:seasonId/match/:matchId"
            element={
              <Shell>
                <MatchSummary />
              </Shell>
            }
          />
          <Route
            path="/season/:seasonId/match/:matchId/team-a"
            element={
              <Shell>
                <TeamPlayers teamKey="teamA" />
              </Shell>
            }
          />
          <Route
            path="/season/:seasonId/match/:matchId/team-b"
            element={
              <Shell>
                <TeamPlayers teamKey="teamB" />
              </Shell>
            }
          />
          <Route
            path="/season/:seasonId/match/:matchId/toss"
            element={
              <Shell>
                <TossPage />
              </Shell>
            }
          />
          <Route
            path="/season/:seasonId/match/:matchId/live"
            element={
              <Shell>
                <LiveMatch />
              </Shell>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
