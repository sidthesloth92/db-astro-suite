/**
 * Safely parses a string value (typically from an environment variable) into a positive integer.
 *
 * @param {string|undefined} rawValue - The raw string input to parse.
 * @param {number} fallbackValue - The value to return if parsing fails or the result is not > 0.
 * @returns {number} The parsed positive integer or the fallback value.
 */
export function parsePositiveInteger(rawValue, fallbackValue) {
  const parsedValue = Number.parseInt(rawValue ?? "", 10);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallbackValue;
}
