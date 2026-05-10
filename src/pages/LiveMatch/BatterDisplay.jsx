import { renderBatStats } from "../../utils/renderStats";
import { card, tableHeader, row, selectable } from "./LiveMatch.styles";

export default function BatterDisplay({ live, innings, onSelectBatter }) {
  return (
    <div style={card}>
      <div style={tableHeader}>
        <span>Batter</span>
        <span>R</span>
        <span>B</span>
        <span>4s</span>
        <span>6s</span>
      </div>

      {[live.striker, live.nonStriker].map((name, idx) => (
        <div key={idx} style={row}>
          <span
            style={selectable(!name)}
            onClick={() =>
              !name && onSelectBatter(idx === 0 ? "striker" : "nonStriker")
            }
          >
            {name ? `${name}${idx === 0 ? " *" : ""}` : "Select"}
          </span>
          {renderBatStats(innings, name)}
        </div>
      ))}
    </div>
  );
}
