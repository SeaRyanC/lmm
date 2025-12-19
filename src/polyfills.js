// Browser polyfills for Node.js built-ins
import { Buffer } from 'buffer';

if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {}, browser: true };
}

// Add process.nextTick polyfill
if (typeof globalThis.process.nextTick === 'undefined') {
  globalThis.process.nextTick = function(callback, ...args) {
    queueMicrotask(() => callback(...args));
  };
}
