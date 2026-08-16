export const createLocalMatchId = () => `match_${crypto.randomUUID()}`;

export const getMatchIdempotencyKey = (matchOrId) => {
  const id = typeof matchOrId === "string" ? matchOrId : matchOrId?.id;
  if (!id) throw new Error("Match id is required for idempotent sync");
  return `gully-match:${id}`;
};
