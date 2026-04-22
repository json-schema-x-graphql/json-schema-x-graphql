import prettier from "prettier";

/**
 * Format an object as prettified JSON using Prettier.
 * Returns a string ready to write to disk.
 */
export function formatJson(obj) {
  const raw = JSON.stringify(obj);
  // Use Prettier's JSON parser to get consistent, single-line short arrays etc.
  return prettier.format(raw, { parser: "json" });
}
