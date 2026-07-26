import BottomSheetSelector from "./BottomSheetSelector";
import { applyWicket } from "../utils/applyWicket";
import { formatName } from "../utils/helpers";
import styles from "./WicketSheet.module.css";

const WICKET_TYPES = [
  "BOWLED",
  "CAUGHT",
  "LBW",
  "STUMPED",
  "RUN_OUT",
  "HIT_WICKET",
  "SPECIAL",
];

const ALLOWED_ON_NO_BALL = new Set(["RUN_OUT"]);
const ALLOWED_ON_WIDE = new Set(["RUN_OUT", "STUMPED"]);

const isAllowedForExtra = (wicketType, extraMode) => {
  if (!wicketType || extraMode === "NORMAL") return true;
  if (extraMode === "NO_BALL") return ALLOWED_ON_NO_BALL.has(wicketType);
  if (extraMode === "WIDE") return ALLOWED_ON_WIDE.has(wicketType);
  return true;
};

const initialWicketUi = {
  open: false,
  type: null,
  helper: null,
  runOut: { outBatsman: null, runs: 0 },
};

export default function WicketSheet({
  open,
  wicketUI,
  setWicketUI,
  live,
  bowlingPlayers,
  match,
  setMatch,
  extraMode,
  setExtraMode,
}) {
  const isInvalidWicket = !isAllowedForExtra(wicketUI.type, extraMode);
  const requiresHelper = ["CAUGHT", "RUN_OUT", "STUMPED"].includes(
    wicketUI.type,
  );
  const runOutBatter = wicketUI.runOut.outBatsman;

  const canConfirm = Boolean(
    wicketUI.type &&
      !isInvalidWicket &&
      (wicketUI.type !== "RUN_OUT" || runOutBatter) &&
      (!requiresHelper || wicketUI.helper),
  );

  const close = () => setWicketUI(initialWicketUi);

  return (
    <BottomSheetSelector open={open} title="Wicket" onClose={close}>
      <section className={styles.section}>
        <h4>Dismissal type</h4>
        <div className={styles.typeGrid}>
          {WICKET_TYPES.map((type) => {
            const disabled = !isAllowedForExtra(type, extraMode);
            return (
              <button
                key={type}
                type="button"
                disabled={disabled}
                className={wicketUI.type === type ? styles.active : ""}
                onClick={() =>
                  setWicketUI({
                    ...wicketUI,
                    type,
                    helper: null,
                  })
                }
              >
                {type.replaceAll("_", " ")}
              </button>
            );
          })}
        </div>
      </section>

      {wicketUI.type === "RUN_OUT" && (
        <section className={styles.section}>
          <h4>Who is out?</h4>
          <div className={styles.playerList}>
            {[live.striker, live.nonStriker].filter(Boolean).map((player) => (
              <button
                key={player}
                type="button"
                className={runOutBatter === player ? styles.selectedRow : ""}
                onClick={() =>
                  setWicketUI({
                    ...wicketUI,
                    runOut: { ...wicketUI.runOut, outBatsman: player },
                  })
                }
              >
                {formatName(player)}
              </button>
            ))}
          </div>

          <h4 className={styles.spacedHeading}>Runs completed</h4>
          <div className={styles.runsRow}>
            {[0, 1, 2, 3, 4].map((run) => (
              <button
                key={run}
                type="button"
                className={wicketUI.runOut.runs === run ? styles.active : ""}
                onClick={() =>
                  setWicketUI({
                    ...wicketUI,
                    runOut: { ...wicketUI.runOut, runs: run },
                  })
                }
              >
                {run}
              </button>
            ))}
          </div>
        </section>
      )}

      {requiresHelper && (
        <section className={styles.section}>
          <h4>{wicketUI.type === "CAUGHT" ? "Fielder" : "Fielder / keeper"}</h4>
          <div className={styles.fielderList}>
            {bowlingPlayers.map((player) => (
              <button
                key={player}
                type="button"
                className={wicketUI.helper === player ? styles.selectedRow : ""}
                onClick={() => setWicketUI({ ...wicketUI, helper: player })}
              >
                {formatName(player)}
              </button>
            ))}
          </div>
        </section>
      )}

      {isInvalidWicket && (
        <p className={styles.errorText}>
          {wicketUI.type.replaceAll("_", " ")} is not valid on a {extraMode.toLowerCase().replace("_", "-")}.
        </p>
      )}

      <button
        type="button"
        className={styles.confirmButton}
        disabled={!canConfirm}
        onClick={() => {
          const outBatsman =
            wicketUI.type === "RUN_OUT" ? runOutBatter : live.striker;

          applyWicket({
            wicketType: wicketUI.type,
            outBatsman,
            helper: wicketUI.helper,
            runs: wicketUI.type === "RUN_OUT" ? wicketUI.runOut.runs : 0,
            match,
            setMatch,
            extraMode,
            setExtraMode,
          });
          close();
        }}
      >
        Confirm wicket
      </button>
    </BottomSheetSelector>
  );
}
