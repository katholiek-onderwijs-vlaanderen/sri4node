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
declare const originalConsole: TConsoleMethods;
declare function initializeConsoleProxy(): void;
export { originalConsole, initializeConsoleProxy };
