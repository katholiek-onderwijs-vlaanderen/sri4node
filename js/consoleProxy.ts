/**
 * Console proxy module that prepends ISO timestamps to all console output.
 * This ensures that any project importing sri4node will have timestamps
 * prepended to all their console logs automatically.
 */

const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

function getTimestamp(): string {
  return new Date().toISOString();
}

function initializeConsoleProxy(): void {
  console.log = function (...args: any[]) {
    originalConsole.log(getTimestamp(), ...args);
  };

  console.error = function (...args: any[]) {
    originalConsole.error(getTimestamp(), ...args);
  };

  console.warn = function (...args: any[]) {
    originalConsole.warn(getTimestamp(), ...args);
  };

  console.info = function (...args: any[]) {
    originalConsole.info(getTimestamp(), ...args);
  };

  console.debug = function (...args: any[]) {
    originalConsole.debug(getTimestamp(), ...args);
  };
}

export { originalConsole, initializeConsoleProxy };
