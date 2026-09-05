import { describe, expect, it } from "vitest";
import { migrateStoredMatch } from "../matchSchema";

describe("migrateStoredMatch", () => {
  it("normalizes legacy local match fields into the current reducer shape", () => {
    const migrated = migrateStoredMatch({
      id: "legacy-1",
      seasonId: "season-1",
      status: "setup",
      matchType: "LIMITED_OVERS",
      teams: {
        teamA: { name: " Eagles ", players: [" Alice ", "alice"] },
        teamB: { name: "Warriors", players: ["Bob"] },
      },
      innings: [
        {
          battingTeam: "EAGLES",
          bowlingTeam: "WARRIORS",
          score: 24,
          wickets: 2,
          balls: 12,
        },
      ],
    });

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.status).toBe("SETUP");
    expect(migrated.matchType).toBe("OVERS");
    expect(migrated.teams.teamA.name).toBe("eagles");
    expect(migrated.teams.teamA.players).toEqual(["alice"]);
    expect(migrated.innings[0].totalRuns).toBe(24);
    expect(migrated.innings[0].extras).toEqual({ wides: 0, noBalls: 0, byes: 0 });
  });
});
