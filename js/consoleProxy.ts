/**
 * Console proxy module that prepends ISO timestamps to all console output.
 * The real, unpatched console methods are stored on globalThis so that the
 * proxy is applied only once, even if this module is loaded multiple times.
 */

type TConsoleMethods = {
  log: typeof console.log;
  error: typeof console.error;
  warn: typeof console.warn;
  info: typeof console.info;
  debug: typeof console.debug;
};

const ORIGINAL_KEY = Symbol.for("sri4node.originalConsole");
const PROXIED_KEY = Symbol.for("sri4node.consoleProxied");

const g = globalThis as any;

// capture the REAL console only once, across all module instances
if (!g[ORIGINAL_KEY]) {
  g[ORIGINAL_KEY] = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
  } as TConsoleMethods;
}

const originalConsole: TConsoleMethods = g[ORIGINAL_KEY];

function getTimestamp(): string {
  return new Date().toISOString();
}

function initializeConsoleProxy(): void {
  if (g[PROXIED_KEY]) {
    return;
  }
  g[PROXIED_KEY] = true;

  (Object.keys(originalConsole) as Array<keyof TConsoleMethods>).forEach((method) => {
    console[method] = (...args: any[]) => originalConsole[method](getTimestamp(), ...args);
  });
}

export { originalConsole, initializeConsoleProxy };
