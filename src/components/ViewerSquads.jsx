import { formatName } from "../utils/helpers";
import styles from "./ViewerSquads.module.css";

function TeamSquad({ team }) {
  const players = Array.isArray(team?.players) ? team.players.filter(Boolean) : [];

  return (
    <div className={styles.teamBlock}>
      <div className={styles.teamHeader}>
        <strong>{formatName(team?.name || "Team")}</strong>
        <span>
          {players.length} player{players.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className={styles.players}>
        {players.length > 0 ? (
          players.map((player) => (
            <span key={player} className={styles.playerChip}>
              {formatName(player)}
            </span>
          ))
        ) : (
          <span className={styles.empty}>Squad not available</span>
        )}
      </div>
    </div>
  );
}

export default function ViewerSquads({ match }) {
  return (
    <section className={styles.card} aria-label="Team players">
      <div className={styles.titleRow}>
        <strong>Players</strong>
        <span>Match squads</span>
      </div>

      <div className={styles.grid}>
        <TeamSquad team={match?.teams?.teamA} />
        <TeamSquad team={match?.teams?.teamB} />
      </div>
    </section>
  );
}
