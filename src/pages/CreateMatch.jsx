import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { saveMatch } from "../storage/matchDB";
import { TeamSearch } from "../components/TeamSearch.jsx";
import {
  MATCH_TYPES,
  TEST_INNINGS_OPTIONS,
  normalizeName,
} from "../utils/matchModel";
import { createLocalMatchId } from "../utils/matchIdentity";
import styles from "./CreateMatch.module.css";

const emptyTeam = () => ({
  id: "",
  name: "",
  query: "",
  players: [],
  playersLoaded: true,
});

const normalizePlayers = (players = []) =>
  [...new Set(players.map(normalizeName).filter(Boolean))];

export default function CreateMatch() {
  const navigate = useNavigate();
  const { seasonId } = useParams();

  const [teamA, setTeamA] = useState(emptyTeam);
  const [teamB, setTeamB] = useState(emptyTeam);
  const [matchType, setMatchType] = useState(MATCH_TYPES.OVERS);
  const [overs, setOvers] = useState(6);
  const [testInningsPerTeam, setTestInningsPerTeam] = useState(
    TEST_INNINGS_OPTIONS.DOUBLE,
  );
  const [teamALoading, setTeamALoading] = useState(false);
  const [teamBLoading, setTeamBLoading] = useState(false);

  const normalizedTeamA = normalizeName(teamA.name || teamA.query);
  const normalizedTeamB = normalizeName(teamB.name || teamB.query);

  const validationMessage = useMemo(() => {
    if (!normalizedTeamA || !normalizedTeamB) return "Select both teams";
    if (teamALoading || teamBLoading) return "Loading existing squad…";
    if (normalizedTeamA === normalizedTeamB) return "Teams must be different";
    if (matchType === MATCH_TYPES.OVERS && Number(overs) < 1) {
      return "Overs must be at least 1";
    }
    return "";
  }, [
    matchType,
    normalizedTeamA,
    normalizedTeamB,
    overs,
    teamALoading,
    teamBLoading,
  ]);

  const canCreate = !validationMessage;

  const handleCreate = async () => {
    if (!canCreate) return;

    const resolveTeam = (team) => ({
      name: normalizeName(team.name || team.query),
      players: normalizePlayers(team.players),
      isExisting: Boolean(team.id),
      seasonSquadLoaded: team.id ? team.playersLoaded !== false : true,
      ...(team.id ? { id: team.id } : {}),
    });

    const matchId = createLocalMatchId();
    const match = {
      id: matchId,
      seasonId,
      status: "setup",
      matchType,
      totalOvers:
        matchType === MATCH_TYPES.OVERS ? Number(overs) : null,
      testConfig:
        matchType === MATCH_TYPES.TEST
          ? { inningsPerTeam: testInningsPerTeam }
          : null,
      rules: {
        wide: { extraRun: false, extraBall: true },
        noBall: { extraRun: true, extraBall: true },
      },
      teams: {
        teamA: resolveTeam(teamA),
        teamB: resolveTeam(teamB),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      schemaVersion: 3,
      syncStatus: "local",
    };

    await saveMatch(match);
    navigate(`/season/${seasonId}/match/${matchId}/team-a`, { replace: true });
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ←
        </button>
        <div className={styles.headerCopy}>
          <h1>New match</h1>
          <p>Choose teams and configure the scoring format.</p>
        </div>
        <span className={styles.seasonBadge}>Season</span>
      </header>

      <section className={styles.card}>
        <div className={styles.sectionHeading}>
          <span aria-hidden="true">🛡️</span>
          <div>
            <h2>Select teams</h2>
            <p>Existing squads will be loaded automatically.</p>
          </div>
        </div>

        <div className={styles.teamGrid}>
          <TeamSearch
            label="Team A"
            value={teamA}
            setValue={setTeamA}
            otherSelectedName={teamB.name}
            seasonId={seasonId}
            onSquadLoadingChange={setTeamALoading}
          />
          <span className={styles.vs}>VS</span>
          <TeamSearch
            label="Team B"
            value={teamB}
            setValue={setTeamB}
            otherSelectedName={teamA.name}
            seasonId={seasonId}
            onSquadLoadingChange={setTeamBLoading}
          />
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeading}>
          <span aria-hidden="true">⚙️</span>
          <div>
            <h2>Match format</h2>
            <p>Test matches do not use an over limit.</p>
          </div>
        </div>

        <div className={styles.segmentedControl}>
          <button
            type="button"
            className={matchType === MATCH_TYPES.OVERS ? styles.active : ""}
            onClick={() => setMatchType(MATCH_TYPES.OVERS)}
          >
            Limited overs
          </button>
          <button
            type="button"
            className={matchType === MATCH_TYPES.TEST ? styles.active : ""}
            onClick={() => setMatchType(MATCH_TYPES.TEST)}
          >
            Test match
          </button>
        </div>

        {matchType === MATCH_TYPES.OVERS ? (
          <label className={styles.field}>
            <span>Overs per innings</span>
            <input
              type="number"
              min="1"
              max="50"
              inputMode="numeric"
              value={overs}
              onChange={(event) => setOvers(event.target.value)}
            />
          </label>
        ) : (
          <div className={styles.testOptions}>
            <div className={styles.fieldLabel}>
              <strong>Innings per team</strong>
              <span>You can still change this during the first innings.</span>
            </div>
            <div className={styles.optionGrid}>
              <button
                type="button"
                className={
                  testInningsPerTeam === TEST_INNINGS_OPTIONS.SINGLE
                    ? styles.selectedOption
                    : ""
                }
                onClick={() =>
                  setTestInningsPerTeam(TEST_INNINGS_OPTIONS.SINGLE)
                }
              >
                <strong>Single innings</strong>
                <span>Two innings total</span>
              </button>
              <button
                type="button"
                className={
                  testInningsPerTeam === TEST_INNINGS_OPTIONS.DOUBLE
                    ? styles.selectedOption
                    : ""
                }
                onClick={() =>
                  setTestInningsPerTeam(TEST_INNINGS_OPTIONS.DOUBLE)
                }
              >
                <strong>Double innings</strong>
                <span>Four innings total</span>
              </button>
            </div>
          </div>
        )}
      </section>

      <div className={styles.footer}>
        {validationMessage && (
          <p className={styles.validation}>{validationMessage}</p>
        )}
        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleCreate}
          disabled={!canCreate}
        >
          Begin match setup
        </button>
      </div>
    </main>
  );
}
