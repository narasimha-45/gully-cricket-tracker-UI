import { openDB } from "idb";

export const dbPromise = openDB("gully-cricket-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("matches")) {
      db.createObjectStore("matches", { keyPath: "id" });
    }
  }
});

export async function saveMatch(match) {
  const db = await dbPromise;
  await db.put("matches", match);
}


export async function getMatch(matchId) {
  const db = await dbPromise;
  console.log("DB:",db)
  return db.get("matches", matchId);
}

export async function updateMatch(match) {
  const db = await dbPromise;
  await db.put("matches", {
    ...match,
    updatedAt: Date.now()
  });
}


export async function getMatchesBySeason(seasonId) {
  const db = await dbPromise;
  const all = await db.getAll("matches");
  return all.filter((m) => m.seasonId === seasonId);
}


export async function deleteMatch(matchId) {
  const db = await dbPromise;
  await db.delete("matches", matchId);
}


