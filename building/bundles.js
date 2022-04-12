import {WorkerPool} from "./worker-pool.js";

import {esPure            as _esPure}            from "./bundles/esPure.js";
import {esDependencies    as _esDependencies}    from "./bundles/esDependencies.js";
import {browserPure       as _browserPure}       from "./bundles/browserPure.js";
import {browserCryptoES   as _browserCryptoES}   from "./bundles/browserCryptoES.js";
import {esStandalone      as _esStandalone}      from "./bundles/esStandalone.js";
import {browserStandalone as _browserStandalone} from "./bundles/browserStandalone.js";


// Wrap with worker thread
const workerPool = new WorkerPool(4);

export const esPure            = workerPool.wrap(_esPure,            import.meta.url);
export const esDependencies    = workerPool.wrap(_esDependencies,    import.meta.url);
export const browserPure       = workerPool.wrap(_browserPure,       import.meta.url);
export const browserCryptoES   = workerPool.wrap(_browserCryptoES,   import.meta.url);
export const esStandalone      = workerPool.wrap(_esStandalone,      import.meta.url);
export const browserStandalone = workerPool.wrap(_browserStandalone, import.meta.url);
