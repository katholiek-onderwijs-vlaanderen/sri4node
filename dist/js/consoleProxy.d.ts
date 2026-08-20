/**
 * Console proxy module that prepends ISO timestamps to all console output.
 * This ensures that any project importing sri4node will have timestamps
 * prepended to all their console logs automatically.
 */
declare const originalConsole: {
    log: any;
    error: any;
    warn: any;
    info: any;
    debug: any;
};
declare function initializeConsoleProxy(): void;
export { originalConsole, initializeConsoleProxy };
