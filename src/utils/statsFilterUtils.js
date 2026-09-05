export const asSelectedArray = (value) => {
  if (Array.isArray(value)) {
    return value.filter((entry) => entry !== undefined && entry !== null && entry !== "" && entry !== "All");
  }
  return value && value !== "All" ? [value] : [];
};

export const normalizeSeasonFilter = (value) => {
  if (Array.isArray(value)) return asSelectedArray(value).map(String);
  if (!value || value === "all" || value === "All") return [];
  return [String(value)];
};

export const selectedOrUndefined = (value) => {
  const selected = asSelectedArray(value);
  return selected.length ? selected : undefined;
};

export const selectedNumbersOrUndefined = (value) => {
  const selected = asSelectedArray(value)
    .map(Number)
    .filter(Number.isFinite);
  return selected.length ? selected : undefined;
};

export const selectedMappedOrUndefined = (value, mapping) => {
  const selected = asSelectedArray(value)
    .map((entry) => mapping[entry])
    .filter((entry) => entry !== undefined && entry !== null);
  return selected.length ? selected : undefined;
};

export const buildActiveFilterLabels = (definitions, selectedFilters) =>
  definitions.flatMap((definition) => {
    const selected = definition.multiple
      ? asSelectedArray(selectedFilters?.[definition.key])
      : asSelectedArray(selectedFilters?.[definition.key]).slice(0, 1);

    if (!selected.length) return [];

    const labels = selected.map((value) => {
      const option = definition.options.find((item) =>
        String(typeof item === "string" ? item : item.value) === String(value),
      );
      return typeof option === "string" ? option : option?.label || String(value);
    });

    return [{
      label: definition.label,
      value: labels.join(", "),
      text: `${definition.label}: ${labels.join(", ")}`,
    }];
  });
