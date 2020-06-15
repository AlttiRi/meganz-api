import {workerWrapper} from "./worker.js";

import {esPure as _esPure} from "./bundles/esPure.js";
import {esDependencies as _esDependencies} from "./bundles/esDependencies.js";
import {browserPure  as _browserPure} from "./bundles/browserPure.js";
import {browserCryptoES as _browserCryptoES} from "./bundles/browserCryptoES.js";
import {esStandalone as _esStandalone} from "./bundles/esStandalone.js";
import {browserStandalone as _browserStandalone} from "./bundles/browserStandalone.js";


// Wrap with worker thread
export const esPure = workerWrapper(_esPure, import.meta.url);
export const esDependencies = workerWrapper(_esDependencies, import.meta.url);
export const browserPure = workerWrapper(_browserPure, import.meta.url);
export const browserCryptoES = workerWrapper(_browserCryptoES, import.meta.url);
export const esStandalone = workerWrapper(_esStandalone, import.meta.url);
export const browserStandalone = workerWrapper(_browserStandalone, import.meta.url);