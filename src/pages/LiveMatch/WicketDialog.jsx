import { applyWicket } from "../../utils/applyWicket";
import {
  grid2,
  btn,
  activeBtn,
  listItem,
  selectedListItem,
  confirmBtn,
} from "./LiveMatch.styles";

export default function WicketDialog({
  open,
  wicketUI,
  setWicketUI,
  live,
  bowlingPlayers,
  match,
  setMatch,
  extraMode,
  setExtraMode,
  onClose,
}) {
  if (!open) return null;

  const WICKET_TYPES = [
    "BOWLED",
    "CAUGHT",
    "LBW",
    "STUMPED",
    "RUN_OUT",
    "HIT_WICKET",
    "SPECIAL",
  ];

  const invalidOnExtra = ["BOWLED", "LBW", "HIT_WICKET"];

  const isInvalidWicket =
    (extraMode === "NO_BALL" || extraMode === "WIDE") &&
    invalidOnExtra.includes(wicketUI.type);

  const handleConfirm = () => {
    const outBatsman =
      wicketUI.type === "RUN_OUT"
        ? wicketUI.runOut.outBatsman
        : live.striker;

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

    setWicketUI({
      open: false,
      type: null,
      helper: null,
      runOut: { outBatsman: null, runs: 0 },
    });
  };

  return (
    <>
      {/* WICKET TYPE */}
      <h4>Wicket Type</h4>
      <div style={grid2}>
        {WICKET_TYPES.map((t) => (
          <button
            key={t}
            style={wicketUI.type === t ? activeBtn : btn}
            onClick={() => setWicketUI({ ...wicketUI, type: t })}
          >
            {t.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* RUN OUT: WHO IS OUT */}
      {wicketUI.type === "RUN_OUT" && (
        <>
          <h4>Who got run out?</h4>
          {[live.striker, live.nonStriker].map((p) => (
            <div
              key={p}
              style={
                wicketUI.runOut.outBatsman === p ? selectedListItem : listItem
              }
              onClick={() =>
                setWicketUI({
                  ...wicketUI,
                  runOut: {
                    ...wicketUI.runOut,
                    outBatsman: p,
                  },
                })
              }
            >
              {p}
            </div>
          ))}

          <h4 style={{ marginTop: 12 }}>Runs completed</h4>
          <div style={grid2}>
            {[0, 1, 2, 3, 4].map((r) => (
              <button
                key={r}
                style={wicketUI.runOut.runs === r ? activeBtn : btn}
                onClick={() =>
                  setWicketUI({
                    ...wicketUI,
                    runOut: {
                      ...wicketUI.runOut,
                      runs: r,
                    },
                  })
                }
              >
                {r}
              </button>
            ))}
          </div>
        </>
      )}

      {/* FIELDER / CATCHER */}
      {["CAUGHT", "RUN_OUT", "STUMPED"].includes(wicketUI.type) && (
        <>
          <h4>Fielder</h4>
          {bowlingPlayers.map((p) => (
            <div
              key={p}
              style={wicketUI.helper === p ? selectedListItem : listItem}
              onClick={() => setWicketUI({ ...wicketUI, helper: p })}
            >
              {p}
            </div>
          ))}
        </>
      )}

      {/* ERROR */}
      {isInvalidWicket && (
        <p style={{ color: "red" }}>
          This wicket is not allowed on {extraMode}
        </p>
      )}

      {["CAUGHT", "RUN_OUT", "STUMPED"].includes(wicketUI.type) &&
        !wicketUI.helper && (
          <p style={{ color: "red" }}>Please select a fielder</p>
        )}

      {/* CONFIRM */}
      <button
        style={confirmBtn}
        disabled={
          !wicketUI.type ||
          (wicketUI.type === "RUN_OUT" && !wicketUI.runOut.outBatsman)
        }
        onClick={handleConfirm}
      >
        Confirm Wicket
      </button>
    </>
  );
}
