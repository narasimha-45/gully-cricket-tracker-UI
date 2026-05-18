export const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

export const formatName = (name) =>
  (name || "").charAt(0).toUpperCase() + (name || "").slice(1);
