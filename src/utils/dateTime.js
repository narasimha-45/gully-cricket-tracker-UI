export const formatDateInIST = (value, options = {}) => {
  if (value === null || value === undefined || value === "") return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    ...options,
    timeZone: "Asia/Kolkata",
  }).format(date);
};