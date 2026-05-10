import { deepCopy } from "../../utils/helpers";
import { saveMatch } from "../../storage/matchDB";
import {
  applyRun,
  handleOverEnd,
  retireBatsman,
} from "../../utils/matchEvents";
import { undoLast } from "../../utils/undos";
import {
  keypad,
  keyBtn,
  keyWide,
  keyWideActive,
  keyWicket,
  keyWicketDisabled,
  keyUndo,
  keyUndoDisabled,
} from "./LiveMatch.styles";

export default function Keypad({
  match,
  setMatch,
  extraMode,
  setExtraMode,
  onWicketClick,
}) {
  const { live, innings } = match;

  const setExtraModeWithHistory = (mode) => {
    setExtraMode((prev) => (prev === mode ? "NORMAL" : mode));
  };

  const handleStrikeChange = () => {
    const updated = deepCopy(match);
    const live = updated.live;
    const innings = updated.innings[live.inningsIndex];

    // FULL history snapshot (same as others)
    live.history.push({
      type: "STRIKE_CHANGE",
      prevState: {
        striker: live.striker,
        nonStriker: live.nonStriker,
        bowler: live.bowler,
        lastOverBowler: live.lastOverBowler,
        balls: innings.balls,
        totalRuns: innings.totalRuns,
        wickets: innings.wickets,
        battingStats: deepCopy(innings.battingStats),
        bowlingStats: deepCopy(innings.bowlingStats),
        outBatsmen: [...live.outBatsmen],
        thisOver: deepCopy(innings.thisOver || []),
        extraMode,
      },
    });

    // swap strike
    [live.striker, live.nonStriker] = [live.nonStriker, live.striker];

    updated.updatedAt = Date.now();
    saveMatch(updated);
    setMatch(updated);
  };

  return (
    <div style={keypad}>
      {[0, 1, 2, 3, 4, 6].map((r) => (
        <button
          key={r}
          style={keyBtn}
          onClick={() =>
            applyRun({
              runs: r,
              match,
              setMatch,
              extraMode,
              setExtraMode,
            })
          }
        >
          {r}
        </button>
      ))}

      <button
        style={extraMode === "WIDE" ? keyWideActive : keyWide}
        onClick={() => setExtraModeWithHistory("WIDE")}
      >
        Wd
      </button>

      <button
        style={extraMode === "NO_BALL" ? keyWideActive : keyWide}
        onClick={() => setExtraModeWithHistory("NO_BALL")}
      >
        Nb
      </button>

      <button
        style={
          !live.striker || !live.nonStriker || !live.bowler
            ? keyWicketDisabled
            : keyWicket
        }
        disabled={!live.striker || !live.nonStriker || !live.bowler}
        onClick={onWicketClick}
      >
        W
      </button>

      <button
        style={live.history.length === 0 ? keyUndoDisabled : keyUndo}
        onClick={() => undoLast({ match, setMatch, setExtraMode })}
        disabled={live.history.length === 0}
      >
        ↺
      </button>

      <button style={keyBtn} onClick={handleStrikeChange}>
        ⇄
      </button>

      <button
        style={keyBtn}
        disabled={!live.striker}
        onClick={() => retireBatsman(live.striker, match, setMatch)}
      >
        Ret
      </button>
    </div>
  );
}
