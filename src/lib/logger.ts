/**
 * Dev-only logger utility.
 * Wraps console methods so they only execute in development mode.
 * In production builds, all calls are no-ops.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  error: (...args: unknown[]) => { if (isDev) console.error(...args); },
  warn:  (...args: unknown[]) => { if (isDev) console.warn(...args); },
  info:  (...args: unknown[]) => { if (isDev) console.info(...args); },
  log:   (...args: unknown[]) => { if (isDev) console.log(...args); },
};
