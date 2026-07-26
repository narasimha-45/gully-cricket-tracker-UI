import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EditMatchSheet from "../components/EditMatchSheet";
import InsightsTab from "../components/InsightsTab";
import LiveScoringPanel from "../components/LiveScoringPanel";
import MatchHero from "../components/MatchHero";
import MatchPopup from "../components/MatchPopup";
import MatchSummaryTab from "../components/MatchSummaryTab";
import OversTimeline from "../components/OversTimeline";
import Scorecard from "../components/Scorecard";
import { getMatch } from "../storage/matchDB";
import { acknowledgeMatchResult } from "../utils/acknowledgeMatchResult";
import { formatName } from "../utils/helpers";
import { startNextInnings, startSuperOver } from "../utils/matchEvents";
import {
  canEnforceFollowOn,
  getFollowOnLead,
} from "../utils/matchModel";
import { formatMatchResult } from "../utils/matchPresentation";
import { recreateMatch } from "../utils/recreateMatch";
import {
  undoFromInningsPopup,
  undoFromMatchPopup,
} from "../utils/undos";
import styles from "./LiveMatch.module.css";

const tabs = ["live", "scorecard", "overs", "insights"];

export default function LiveMatch() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(undefined);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("live");
  const [extraMode, setExtraMode] = useState("NORMAL");
  const [ackSubmitting, setAckSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    getMatch(matchId)
      .then((storedMatch) => {
        if (active) setMatch(storedMatch || null);
      })
      .catch(() => {
        if (active) setMatch(null);
      });

    return () => {
      active = false;
    };
  }, [matchId]);

  useEffect(() => {
    if (!match?.seasonId) return undefined;

    const handlePopState = () =>
      navigate(`/season/${match.seasonId}/matches`, { replace: true });

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [match?.seasonId, navigate]);

  if (match === undefined) {
    return <p className={styles.stateMessage}>Loading match…</p>;
  }

  if (!match) {
    return (
      <main className={styles.page}>
        <p className={`${styles.stateMessage} ${styles.errorState}`}>
          Match not found on this device.
        </p>
        <button type="button" className={styles.backButton} onClick={() => navigate(-1)}>
          ← Go back
        </button>
      </main>
    );
  }

  if (!match.live || !match.innings?.[match.live.inningsIndex]) {
    return (
      <main className={styles.page}>
        <p className={`${styles.stateMessage} ${styles.errorState}`}>
          Complete the toss before starting scoring.
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
  const nextInningsIndex = live.pendingNextInningsIndex ?? live.inningsIndex + 1;
  const followOnAvailable = canEnforceFollowOn(match);
  const followOnLead = followOnAvailable ? getFollowOnLead(match) : 0;

  const handleHeroAction = () => {
    if (match.status === "COMPLETED") {
      recreateMatch(match, navigate);
      return;
    }
    setEditOpen(true);
  };

  return (
    <main className={styles.page}>
      <EditMatchSheet
        open={editOpen}
        match={match}
        onClose={() => setEditOpen(false)}
        onSave={setMatch}
      />

      <button
        type="button"
        className={styles.backButton}
        onClick={() => navigate(`/season/${match.seasonId}/matches`)}
      >
        ← Back to matches
      </button>

      <MatchHero match={match} onAction={handleHeroAction} />

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
            className={`${styles.tabButton} ${
              tab === item ? styles.activeTab : ""
            }`}
            onClick={() => setTab(item)}
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
      {tab === "live" && match.status === "LIVE" && (
        <LiveScoringPanel
          match={match}
          setMatch={setMatch}
          extraMode={extraMode}
          setExtraMode={setExtraMode}
        />
      )}

      {match.status === "COMPLETED" && match.result && (
        <MatchPopup
          open={!match.ui?.matchResultSeen}
          title={formatMatchResult(match.result)}
          subtitle="Review the scorecard or undo the final scoring action before finishing."
          primaryText="Finish match"
          primaryLoadingText="Finalizing…"
          loading={ackSubmitting}
          onPrimary={() =>
            acknowledgeMatchResult(
              match,
              setMatch,
              setAckSubmitting,
              ackSubmitting,
            )
          }
          secondaryText="Undo last action"
          onSecondary={() => undoFromMatchPopup(match, setMatch, setExtraMode)}
        />
      )}

      <MatchPopup
        open={Boolean(live.pendingNextInnings)}
        title="Innings complete"
        subtitle={`${formatName(currentInnings.battingTeam)} finished on ${
          currentInnings.totalRuns
        }-${currentInnings.wickets}${
          currentInnings.completionReason === "DECLARED" ? " declared" : ""
        }.${
          followOnAvailable
            ? ` ${formatName(match.innings[0].battingTeam)} lead by ${followOnLead} and may enforce the follow-on.`
            : ""
        }`}
        primaryText={`Start innings ${nextInningsIndex + 1}`}
        onPrimary={() => startNextInnings({ match, setMatch })}
        secondaryText={
          followOnAvailable
            ? `Enforce follow-on · Start innings ${nextInningsIndex + 1}`
            : "Undo last action"
        }
        onSecondary={
          followOnAvailable
            ? () => startNextInnings({ match, setMatch, followOn: true })
            : () => undoFromInningsPopup({ match, setMatch, setExtraMode })
        }
        tertiaryText={followOnAvailable ? "Undo last action" : null}
        onTertiary={
          followOnAvailable
            ? () => undoFromInningsPopup({ match, setMatch, setExtraMode })
            : null
        }
      />

      <MatchPopup
        open={Boolean(live.pendingSuperOver)}
        title="Match tied"
        subtitle="Scores are level. Start a Super Over to decide the winner."
        primaryText="Start Super Over"
        onPrimary={() => startSuperOver({ match, setMatch })}
        secondaryText="Undo last action"
        onSecondary={() =>
          undoFromInningsPopup({ match, setMatch, setExtraMode })
        }
      />
    </main>
  );
}
