import { overBox, overBalls, ballChip } from "./LiveMatch.styles";

export default function OverDisplay({ innings, match }) {
  if (!innings.thisOver || innings.thisOver.length === 0) {
    return null;
  }

  return (
    <div style={overBox}>
      <span>This over:</span>

      <div style={overBalls}>
        {innings.thisOver.map((b, i) => {
          // calculate batting runs (excluding automatic extra)
          let batRuns = 0;

          if (b.type === "WIDE") {
            batRuns = Math.max(
              0,
              b.runs - (match.rules?.wide?.extraRun ? 1 : 0),
            );
          }

          if (b.type === "NO_BALL") {
            batRuns = Math.max(
              0,
              b.runs - (match.rules?.noBall?.extraRun ? 1 : 0),
            );
          }

          return (
            <span key={i} style={ballChip}>
              {b.type === "RUN" && b.runs}
              {b.type === "WIDE" && (batRuns > 0 ? `${batRuns}Wd` : "Wd")}
              {b.type === "NO_BALL" && (batRuns > 0 ? `${batRuns}Nb` : "Nb")}
              {b.type === "WICKET" && "W"}
            </span>
          );
        })}
      </div>
    </div>
  );
}
