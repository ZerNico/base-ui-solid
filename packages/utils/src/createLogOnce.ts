import { IS_DEV } from './isDev';

let loggedMessages: Set<string>;
if (IS_DEV) {
  loggedMessages = new Set<string>();
}

/** Creates a dev-only logger that writes each unique message to `console[severity]` once. */
export function createLogOnce(severity: 'warn' | 'error', prefix?: string) {
  return function logOnce(...messages: string[]) {
    if (IS_DEV) {
      const message = messages.join(' ');
      const output = prefix ? `${prefix}: ${message}` : message;
      const key = `${severity}:${output}`;
      if (!loggedMessages.has(key)) {
        loggedMessages.add(key);
        if (severity === 'warn') {
          console.warn(output);
        } else {
          console.error(output);
        }
      }
    }
  };
}

export function reset() {
  loggedMessages?.clear();
}
