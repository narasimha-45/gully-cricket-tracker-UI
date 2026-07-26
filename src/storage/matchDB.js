import { openDB } from "idb";

export const dbPromise = openDB("gully-cricket-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("matches")) {
      db.createObjectStore("matches", { keyPath: "id" });
    }
  },
});

const pendingWrites = new Map();

const cloneForStorage = (value) => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

/**
 * Serializes writes for each match so rapid scoring taps cannot let an older
 * IndexedDB transaction overwrite a newer score.
 */
export function saveMatch(match) {
  if (!match?.id) return Promise.reject(new Error("Match id is required"));

  const snapshot = cloneForStorage(match);
  const previous = pendingWrites.get(match.id) || Promise.resolve();
  const write = previous
    .catch(() => undefined)
    .then(async () => {
      const db = await dbPromise;
      await db.put("matches", snapshot);
    });

  pendingWrites.set(match.id, write);

  const cleanup = () => {
    if (pendingWrites.get(match.id) === write) {
      pendingWrites.delete(match.id);
    }
  };
  write.then(cleanup, cleanup);

  return write;
}

export async function getMatch(matchId) {
  const pending = pendingWrites.get(matchId);
  if (pending) await pending.catch(() => undefined);
  const db = await dbPromise;
  return db.get("matches", matchId);
}

export function updateMatch(match) {
  return saveMatch({ ...match, updatedAt: Date.now() });
}

export async function getMatchesBySeason(seasonId) {
  await Promise.allSettled([...pendingWrites.values()]);
  const db = await dbPromise;
  const all = await db.getAll("matches");
  return all.filter((match) => match.seasonId === seasonId);
}

export async function deleteMatch(matchId) {
  const pending = pendingWrites.get(matchId);
  if (pending) await pending.catch(() => undefined);
  const db = await dbPromise;
  await db.delete("matches", matchId);
}
