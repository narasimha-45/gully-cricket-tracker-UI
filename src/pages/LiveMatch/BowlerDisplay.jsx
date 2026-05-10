import { renderBowlStats } from "../../utils/renderStats";
import { card, tableHeader, row, selectable } from "./LiveMatch.styles";

export default function BowlerDisplay({ live, innings, onSelectBowler }) {
  return (
    <div style={card}>
      <div style={tableHeader}>
        <span>Bowler</span>
        <span>O</span>
        <span>M</span>
        <span>R</span>
        <span>W</span>
      </div>

      <div style={row}>
        <span
          style={selectable(!live.bowler)}
          onClick={() => !live.bowler && onSelectBowler()}
        >
          {live.bowler ? `${live.bowler} *` : "Select bowler"}
        </span>
        {renderBowlStats(innings, live.bowler)}
      </div>
    </div>
  );
}
