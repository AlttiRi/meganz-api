// ----------------------------------------------------------------
// Variant 1 // Only necessary modules

import {WordArray, Hex} from "crypto-es/lib/core.js";
import {AES} from "crypto-es/lib/aes.js";
import {CBC} from "crypto-es/lib/cipher-core.js";
import {NoPadding}   from "crypto-es/lib/pad-nopadding.js";
import {ZeroPadding} from "crypto-es/lib/pad-zeropadding.js";

const CryptoES = {
    /** @type CipherObj */
    AES,
    lib: {
        WordArray
    },
    mode: {
        CBC
    },
    pad: {
        NoPadding,
        ZeroPadding
    },
    enc: {
        Hex
    },
};
export default CryptoES;

// ----------------------------------------------------------------
// Variant 2 // use `import * as ${name}`

// /** @type CipherObj */
// export {AES};
// export const lib  = {WordArray};
// export const mode = {CBC};
// export const pad  = {NoPadding, ZeroPadding};
// export const enc  = {Hex};


// ----------------------------------------------------------------
// Variant 3 // All modules // (tree shaking does not work with objects/classes):

// export CryptoES from "crypto-es";



