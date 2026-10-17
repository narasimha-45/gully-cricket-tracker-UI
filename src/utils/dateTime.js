export const formatDateInIST = (value, options = {}) => {
  if (value === null || value === undefined || value === "") return "";

  // If it's a string without a time zone designator (like Z or +/- offset), append 'Z' to treat it as UTC
  let normalizedValue = value;
  if (typeof value === "string" && !value.includes("Z") && !/[+-]\d{2}:\d{2}\$/.test(value)) {
    normalizedValue = `${value}Z`;
  }

  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    ...options,
    timeZone: "Asia/Kolkata",
  }).format(date);
};
