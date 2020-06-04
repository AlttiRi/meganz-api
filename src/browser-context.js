const btoa = str => Buffer.from(str, "binary").toString("base64");
const atob = b64 => Buffer.from(b64, "base64").toString("binary");

import perf_hooks from "perf_hooks"; /** for `performance.now()` */
const performance = perf_hooks.performance;

import fetch from "node-fetch";

export {btoa, atob, fetch, performance};
// It's used by util.js, mega.js, synchronization.js


// --------------------------------
// For experimental purposes:

// const btoa        = globalThis.btoa,
//       atob        = globalThis.atob,
//       fetch       = globalThis.fetch,
//       performance = globalThis.performance;
// export {btoa, atob, fetch, performance};