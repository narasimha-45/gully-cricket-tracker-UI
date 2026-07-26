import { useState } from "react";
import MatchPopup from "./MatchPopup";
import { formatName } from "../utils/helpers";
import {
  getFinalInningsTarget,
  getScheduledInningsCount,
  getTeamInningsOrdinal,
  getTestInningsPerTeam,
} from "../utils/matchModel";
import {
  declareCurrentTestInnings,
  finishTestAsDraw,
} from "../utils/matchStateHandlers";
import styles from "./TestMatchControls.module.css";

export default function TestMatchControls({ match, setMatch }) {
  const [confirmAction, setConfirmAction] = useState(null);
  const currentIndex = match.live.inningsIndex;
  const current = match.innings[currentIndex];
  const scheduledCount = getScheduledInningsCount(match);
  const isFinalInnings = currentIndex === scheduledCount - 1;
  const target = getFinalInningsTarget(match, currentIndex);
  const inningsOrdinal = getTeamInningsOrdinal(match, currentIndex);
  const inningsPerTeam = getTestInningsPerTeam(match);

  const closeConfirmation = () => setConfirmAction(null);

  const confirm = () => {
    if (confirmAction === "DECLARE") {
      declareCurrentTestInnings({ match, setMatch });
    }
    if (confirmAction === "DRAW") {
      finishTestAsDraw({ match, setMatch });
    }
    closeConfirmation();
  };

  return (
    <>
      <section className={styles.card}>
        <div className={styles.copy}>
          <span className={styles.badge}>Test scoring</span>
          <strong>
            {formatName(current.battingTeam)} ·{" "}
            {inningsOrdinal === 1 ? "1st" : "2nd"} innings
          </strong>
          <p>
            No over limit. This innings ends when the side is all out or you
            declare it.
          </p>
          <span className={styles.meta}>
            {inningsPerTeam === 1 ? "Single innings" : "Double innings"} per
            team
            {match.testConfig?.followOnEnforced ? " · Follow-on enforced" : ""}
            {target ? ` · Target ${target}` : ""}
          </span>
        </div>

        <div className={styles.actions}>
          {!isFinalInnings && (
            <button
              type="button"
              className={styles.declareButton}
              onClick={() => setConfirmAction("DECLARE")}
            >
              Declare innings
            </button>
          )}
          <button
            type="button"
            className={styles.drawButton}
            onClick={() => setConfirmAction("DRAW")}
          >
            End as draw
          </button>
        </div>
      </section>

      <MatchPopup
        open={Boolean(confirmAction)}
        title={
          confirmAction === "DRAW" ? "End match as draw?" : "Declare innings?"
        }
        subtitle={
          confirmAction === "DRAW"
            ? "The current score will be saved and the Test match will be completed as a draw."
            : `${formatName(current.battingTeam)} will close this innings at ${current.totalRuns}-${current.wickets}.`
        }
        primaryText={confirmAction === "DRAW" ? "Confirm Draw" : "Declare"}
        onPrimary={confirm}
        secondaryText="Cancel"
        onSecondary={closeConfirmation}
      />
    </>
  );
}
