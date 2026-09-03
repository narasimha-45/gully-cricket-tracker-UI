import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EditMatchSheet from "../components/EditMatchSheet";
import InsightsTab from "../components/InsightsTab.jsx";
import LiveScoringPanel from "../components/LiveScoringPanel";
import LiveViewerPanel from "../components/LiveViewerPanel";
import MatchHero from "../components/MatchHero";
import MatchPopup from "../components/MatchPopup";
import MatchSummaryTab from "../components/MatchSummaryTab";
import ViewerSquads from "../components/ViewerSquads";
import OversTimeline from "../components/OversTimeline";
import Scorecard from "../components/Scorecard";
import { finalizeAndSyncMatch } from "../features/match/services/finalizeMatch";
import { MATCH_ACTIONS } from "../features/match/state/matchActions";
import { MatchSessionProvider } from "../features/match/state/MatchSessionContext.jsx";
import { useMatchSession } from "../features/match/state/useMatchSession";
import { logger } from "../observability/logger";
import { formatName } from "../utils/helpers";
import { canEnforceFollowOn, getFollowOnLead } from "../utils/matchModel";
import { formatMatchResult } from "../utils/matchPresentation";
import { recreateMatch } from "../utils/recreateMatch";
import styles from "./LiveMatch.module.css";

const tabs = ["live", "scorecard", "overs", "insights"];

export default function LiveMatch() {
  const { matchId } = useParams();
  return (
    <MatchSessionProvider matchId={matchId}>
      <LiveMatchContent />
    </MatchSessionProvider>
  );
}

function LiveMatchContent() {
  const navigate = useNavigate();
  const {
    phase,
    match,
    dispatch,
    error,
    isScorer,
    isViewer,
    liveConnectionState,
  } = useMatchSession();
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("live");
  const [ackSubmitting, setAckSubmitting] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");
  const [finalizeSuccess, setFinalizeSuccess] = useState(false);

  if (phase === "loading") {
    return <p className={styles.stateMessage}>Loading match…</p>;
  }

  if (phase === "error" || !match) {
    return (
      <main className={styles.page}>
        <p className={`${styles.stateMessage} ${styles.errorState}`}>
          {error?.message || "Live match is no longer available."}
        </p>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(-1)}
        >
          ← Go back
        </button>
      </main>
    );
  }

  if (!match.live || !match.innings?.[match.live.inningsIndex]) {
    return (
      <main className={styles.page}>
        <p className={`${styles.stateMessage} ${styles.errorState}`}>
          {isViewer
            ? "The live score is not ready yet."
            : "Complete the toss before starting scoring."}
        </p>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(`/season/${match.seasonId}/matches`)}
        >
          ← Back to matches
        </button>
      </main>
    );
  }

  const { live } = match;
  const currentInnings = match.innings[live.inningsIndex];
  const nextInningsIndex =
    live.pendingNextInningsIndex ?? live.inningsIndex + 1;
  const followOnAvailable = isScorer && canEnforceFollowOn(match);
  const followOnLead = followOnAvailable ? getFollowOnLead(match) : 0;

  const handleHeroAction = () => {
    if (!isScorer) return;
    if (match.status === "COMPLETED") {
      recreateMatch(match, navigate);
      return;
    }
    setEditOpen(true);
  };

  const finishMatch = async () => {
    if (!isScorer || ackSubmitting) return;
    setAckSubmitting(true);
    setFinalizeError("");
    setFinalizeSuccess(false);
    try {
      const result = await finalizeAndSyncMatch({ match, dispatch });
      if (result?.synced) {
        setFinalizeSuccess(true);
      } else {
        setFinalizeError(
          "The match is safe on this device but could not sync to the server yet. Try Finish match again when the connection is available.",
        );
      }
    } catch (syncError) {
      logger.error("match.finalize.failed", {
        matchId: match.id,
        error: syncError,
      });
      setFinalizeError(
        "The final score could not be saved on this device. Keep this screen open and try again.",
      );
    } finally {
      setAckSubmitting(false);
    }
  };

  const connectionLabel =
    liveConnectionState === "connected"
      ? isScorer
        ? "Scorer live"
        : "Watching live"
      : liveConnectionState === "connecting" ||
          liveConnectionState === "reconnecting"
        ? "Reconnecting"
        : isScorer
          ? "Live scoring"
          : "Live viewer";

  return (
    <main className={styles.page}>
      {isScorer && (
        <EditMatchSheet open={editOpen} onClose={() => setEditOpen(false)} />
      )}
      <div className={styles.topRow}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(`/season/${match.seasonId}/matches`)}
        >
          ← Matches
        </button>
        <span
          className={`${styles.liveBadge} ${isViewer ? styles.viewerBadge : ""}`}
        >
          {match.status === "LIVE" ? connectionLabel : "Match complete"}
        </span>
      </div>

      {isScorer && finalizeError && (
        <div className={styles.finalizeError} role="alert">
          <strong>Finish match needs attention</strong>
          <span>{finalizeError}</span>
          <button type="button" onClick={() => setFinalizeError("")}>
            Dismiss
          </button>
        </div>
      )}
      {isScorer && finalizeSuccess && (
        <div className={styles.finalizeSuccess} role="status">
          <span>Match saved and synced.</span>
          <button type="button" onClick={() => setFinalizeSuccess(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className={styles.stickyHero}>
        <MatchHero
          match={match}
          onAction={isScorer ? handleHeroAction : undefined}
        />
      </div>

      {isViewer && match.status === "LIVE" && (
        <ViewerSquads match={match} />
      )}

      {match.status === "COMPLETED" && match.result?.manOfTheMatch && (
        <section className={styles.motmCard}>
          <strong>🏆 Man of the Match</strong>
          <span>{formatName(match.result.manOfTheMatch)}</span>
        </section>
      )}

      <nav className={styles.tabs} aria-label="Match views">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            className={`${styles.tabButton} ${tab === item ? styles.activeTab : ""}`}
            onClick={() => setTab(item)}
            aria-current={tab === item ? "page" : undefined}
          >
            {item === "live"
              ? match.status === "COMPLETED"
                ? "Summary"
                : "Live"
              : formatName(item)}
          </button>
        ))}
      </nav>

      {tab === "scorecard" && <Scorecard match={match} />}
      {tab === "overs" && <OversTimeline match={match} />}
      {tab === "insights" && <InsightsTab match={match} />}
      {tab === "live" && match.status === "COMPLETED" && (
        <MatchSummaryTab match={match} />
      )}
      {tab === "live" && match.status === "LIVE" && isScorer && (
        <LiveScoringPanel />
      )}
      {tab === "live" && match.status === "LIVE" && isViewer && (
        <LiveViewerPanel />
      )}

      {isScorer && match.status === "COMPLETED" && match.result && (
        <MatchPopup
          open={!match.ui?.matchResultSeen}
          title={formatMatchResult(match.result)}
          subtitle="The score is already safe on this device. Finish to sync the completed match when a connection is available."
          primaryText="Finish match"
          primaryLoadingText="Finalizing…"
          loading={ackSubmitting}
          onPrimary={finishMatch}
          secondaryText="Undo last action"
          onSecondary={() =>
            dispatch({
              type: MATCH_ACTIONS.UNDO,
              payload: { allowCompleted: true },
            })
          }
        />
      )}

      {isScorer && (
        <MatchPopup
          open={Boolean(live.pendingNextInnings)}
          title="Innings complete"
          subtitle={`${formatName(currentInnings.battingTeam)}'s innings has ended${currentInnings.completionReason === "DECLARED" ? " by declaration" : ""}.`}
          scoreline={{
            label: formatName(currentInnings.battingTeam),
            runs: currentInnings.totalRuns,
            wickets: currentInnings.wickets,
            declared: currentInnings.completionReason === "DECLARED",
            overs: `${Math.floor(currentInnings.balls / 6)}.${currentInnings.balls % 6}`,
          }}
          banner={
            followOnAvailable
              ? `${formatName(match.innings[0].battingTeam)} lead by ${followOnLead} run${followOnLead === 1 ? "" : "s"} and may enforce the follow-on.`
              : undefined
          }
          primaryText={`Start innings ${nextInningsIndex + 1}`}
          onPrimary={() => dispatch({ type: MATCH_ACTIONS.START_NEXT_INNINGS })}
          secondaryText={
            followOnAvailable
              ? `Enforce follow-on · Start innings ${nextInningsIndex + 1}`
              : "Undo last action"
          }
          onSecondary={
            followOnAvailable
              ? () =>
                  dispatch({
                    type: MATCH_ACTIONS.START_NEXT_INNINGS,
                    payload: { followOn: true },
                  })
              : () =>
                  dispatch({
                    type: MATCH_ACTIONS.UNDO,
                    payload: { allowCompleted: true },
                  })
          }
          tertiaryText={followOnAvailable ? "Undo last action" : null}
          onTertiary={
            followOnAvailable
              ? () =>
                  dispatch({
                    type: MATCH_ACTIONS.UNDO,
                    payload: { allowCompleted: true },
                  })
              : null
          }
        />
      )}

      {isScorer && (
        <MatchPopup
          open={Boolean(live.pendingSuperOver)}
          title="Match tied"
          subtitle="Scores are level. Start a Super Over to decide the winner."
          primaryText="Start Super Over"
          onPrimary={() => dispatch({ type: MATCH_ACTIONS.START_SUPER_OVER })}
          secondaryText="Undo last action"
          onSecondary={() =>
            dispatch({
              type: MATCH_ACTIONS.UNDO,
              payload: { allowCompleted: true },
            })
          }
        />
      )}
    </main>
  );
}
