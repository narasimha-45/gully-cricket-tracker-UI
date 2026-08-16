import { openDB } from "idb";
import { migrateStoredMatch } from "./matchSchema";

const DB_NAME = "gully-cricket-db";
const DB_VERSION = 2;
const STORE = "matches";

export const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion, _newVersion, transaction) {
    let store;
    if (!db.objectStoreNames.contains(STORE)) {
      store = db.createObjectStore(STORE, { keyPath: "id" });
    } else {
      store = transaction.objectStore(STORE);
    }

    if (!store.indexNames.contains("by-season")) {
      store.createIndex("by-season", "seasonId");
    }
    if (!store.indexNames.contains("by-status")) {
      store.createIndex("by-status", "status");
    }
    if (!store.indexNames.contains("by-sync-status")) {
      store.createIndex("by-sync-status", "syncStatus");
    }

    // oldVersion is intentionally unused beyond documenting that this upgrade
    // is additive and safe for existing locally saved matches.
    void oldVersion;
  },
});

const pendingWrites = new Map();

const cloneForStorage = (value) => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const notifyMatchesChanged = (matchId) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("gully:matches-changed", { detail: { matchId } }),
  );
};

const notifyPersistenceError = (error, matchId) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("gully:local-save-error", {
      detail: { matchId, message: error?.message || "Local save failed" },
    }),
  );
};

/**
 * Serializes writes per match. Scoring stays local and non-blocking, while the
 * newest snapshot is durably stored in IndexedDB for crash/reload recovery.
 */
export function saveMatch(match) {
  if (!match?.id) return Promise.reject(new Error("Match id is required"));

  const snapshot = cloneForStorage(match);
  const previous = pendingWrites.get(match.id) || Promise.resolve();
  const write = previous
    .catch(() => undefined)
    .then(async () => {
      const db = await dbPromise;
      await db.put(STORE, snapshot);
      if (snapshot.status === "COMPLETED") notifyMatchesChanged(snapshot.id);
    })
    .catch((error) => {
      notifyPersistenceError(error, match.id);
      throw error;
    });

  pendingWrites.set(match.id, write);

  const cleanup = () => {
    if (pendingWrites.get(match.id) === write) pendingWrites.delete(match.id);
  };
  write.then(cleanup, cleanup);

  return write;
}

export async function getMatch(matchId) {
  const pending = pendingWrites.get(matchId);
  if (pending) await pending.catch(() => undefined);
  const db = await dbPromise;
  return migrateStoredMatch(await db.get(STORE, matchId));
}

export function updateMatch(match) {
  return saveMatch({ ...match, updatedAt: Date.now() });
}

export async function getMatchesBySeason(seasonId) {
  await Promise.allSettled([...pendingWrites.values()]);
  const db = await dbPromise;
  const matches = await db.getAllFromIndex(STORE, "by-season", seasonId);
  return matches.map(migrateStoredMatch);
}

export async function deleteMatch(matchId) {
  const pending = pendingWrites.get(matchId);
  if (pending) await pending.catch(() => undefined);
  const db = await dbPromise;
  await db.delete(STORE, matchId);
  notifyMatchesChanged(matchId);
}

export async function getAllMatches() {
  await Promise.allSettled([...pendingWrites.values()]);
  const db = await dbPromise;
  const matches = await db.getAll(STORE);
  return matches.map(migrateStoredMatch);
}
