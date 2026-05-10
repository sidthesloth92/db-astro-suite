/** Type-safe shape of the global `gtag` function used by Google Analytics 4. */
export type GtagFunction = (
  command: string,
  action: string,
  params?: Record<string, unknown>
) => void;
