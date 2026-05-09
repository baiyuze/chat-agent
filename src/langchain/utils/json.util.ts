export function compactJson(value: unknown) {
  const text =
    typeof value === "string"
      ? value
      : JSON.stringify(value, (_key, nestedValue) => {
          if (typeof nestedValue === "string" && nestedValue.length > 1200) {
            return `${nestedValue.slice(0, 1200)}...`;
          }
          return nestedValue;
        });

  if (!text) return undefined;
  return text.length > 1800 ? `${text.slice(0, 1800)}...` : text;
}
