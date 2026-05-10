import BottomSheetSelector from "./BottomSheetSelector";
import { applyWicket } from "../utils/applyWicket";

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
  const isInvalidWicket =
    (extraMode === "NO_BALL" || extraMode === "WIDE") &&
    invalidOnExtra.includes(wicketUI.type);

  const requiresHelper = ["CAUGHT", "RUN_OUT", "STUMPED"].includes(
    wicketUI.type,
  );

  const canConfirm =
    wicketUI.type &&
    !isInvalidWicket &&
    (wicketUI.type !== "RUN_OUT" || wicketUI.runOut.outBatsman) &&
    (!requiresHelper || wicketUI.helper);

  return (
    <BottomSheetSelector
      open={open}
      title="Wicket"
      onClose={() =>
        setWicketUI({
          open: false,
          type: null,
          helper: null,
          runOut: {
            outBatsman: null,
            runs: 0,
          },
        })
      }
    >
      {/* DISMISSAL TYPE */}
      <div style={section}>
        <h4 style={title}>Dismissal Type</h4>

        <div style={typeGrid}>
          {WICKET_TYPES.map((t) => {
            const disabled =
              (extraMode === "NO_BALL" || extraMode === "WIDE") &&
              invalidOnExtra.includes(t);

            const selected = wicketUI.type === t;

            return (
              <button
                key={t}
                disabled={disabled}
                style={{
                  ...typeBtn,
                  ...(selected ? activeTypeBtn : {}),
                  ...(disabled ? disabledBtn : {}),
                }}
                onClick={() =>
                  setWicketUI({
                    ...wicketUI,
                    type: t,
                  })
                }
              >
                {t.replaceAll("_", " ")}
              </button>
            );
          })}
        </div>
      </div>

      {/* RUN OUT */}
      {wicketUI.type === "RUN_OUT" && (
        <div style={section}>
          <h4 style={title}>Who is out?</h4>

          {[live.striker, live.nonStriker].map((p) => (
            <div
              key={p}
              style={{
                ...playerRow,
                ...(wicketUI.runOut.outBatsman === p ? selectedRow : {}),
              }}
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

          <h4
            style={{
              ...title,
              marginTop: 14,
            }}
          >
            Runs completed
          </h4>

          <div style={runsRow}>
            {[0, 1, 2, 3, 4].map((r) => (
              <button
                key={r}
                style={{
                  ...runBtn,
                  ...(wicketUI.runOut.runs === r ? activeRunBtn : {}),
                }}
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
        </div>
      )}

      {/* FIELDER */}
      {requiresHelper && (
        <div style={section}>
          <h4 style={title}>Fielder</h4>

          <div style={fielderList}>
            {bowlingPlayers.map((p) => (
              <div
                key={p}
                style={{
                  ...playerRow,
                  ...(wicketUI.helper === p ? selectedRow : {}),
                }}
                onClick={() =>
                  setWicketUI({
                    ...wicketUI,
                    helper: p,
                  })
                }
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ERROR */}
      {isInvalidWicket && (
        <p style={errorText}>
          {wicketUI.type.replaceAll("_", " ")} is not allowed on {extraMode}
        </p>
      )}

      {/* CONFIRM */}
      <button
        style={{
          ...confirmBtn,
          opacity: canConfirm ? 1 : 0.5,
        }}
        disabled={!canConfirm}
        onClick={() => {
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
            runOut: {
              outBatsman: null,
              runs: 0,
            },
          });
        }}
      >
        Confirm Wicket
      </button>
    </BottomSheetSelector>
  );
}

/* ---------------- STYLES ---------------- */

const section = {
  marginBottom: 18,
};

const title = {
  marginBottom: 10,
  fontSize: 14,
  fontWeight: 700,
};

const typeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3,1fr)",
  gap: 8,
};

const typeBtn = {
  padding: "12px 6px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};

const activeTypeBtn = {
  background: "#4f46e5",
  color: "#fff",
  border: "none",
};

const disabledBtn = {
  opacity: 0.4,
  cursor: "not-allowed",
};

const playerRow = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  marginBottom: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const selectedRow = {
  background: "#eef2ff",
  border: "1px solid #4f46e5",
  color: "#312e81",
};

const runsRow = {
  display: "flex",
  gap: 8,
};

const runBtn = {
  flex: 1,
  padding: "10px 0",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const activeRunBtn = {
  background: "#4f46e5",
  color: "#fff",
  border: "none",
};

const fielderList = {
  maxHeight: 220,
  overflowY: "auto",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

const errorText = {
  color: "#dc2626",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 12,
};

const confirmBtn = {
  width: "100%",
  padding: "14px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg,#4f46e5,#4338ca)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};
