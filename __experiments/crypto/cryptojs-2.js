import Util from "../../src/util.js";
import {encryptedStr1 as data, key, iv} from "./data.js";

import CryptoJS from "crypto-js";


function decryptWithCryptoJS(data, key, iv = new Uint8Array(key.length)){
    key  = Util.arrayBufferToBinaryString(key);
    iv   = Util.arrayBufferToBinaryString(iv);
    data = Util.arrayBufferToBinaryString(data);

    /** @see CryptoJS.enc.Latin1.stringify code */
    function _wordArrayToArrayBuffer(wordArray) {
        const bites = new Uint8Array(wordArray.sigBytes);
        for (let i = 0; i < wordArray.sigBytes; i++) {
            bites[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }
        return bites;
    }
    // Note: CipherParamsData uses only to get `ciphertext` property, the others will be ignored (iv, mode, padding...)
    const plaintextArray = CryptoJS.AES.decrypt( // (CipherParamsData, WordArray, IBlockCipherCfg)
        {
            ciphertext: CryptoJS.enc.Latin1.parse(data)
        },
        CryptoJS.enc.Latin1.parse(key),
        {
            iv: CryptoJS.enc.Latin1.parse(iv),
            /** It used by default */
            // mode: CryptoJS.mode.CBC,
            /** Commented just for an example. You should use it*/
            // padding: CryptoJS.pad.ZeroPadding
        }
    );

    //console.log(CryptoJS.enc.Latin1.stringify(plaintextArray).length); // 64! (with ZeroPadding)

    return _wordArrayToArrayBuffer(plaintextArray);

    /** Or use it:
     * CryptoJS.enc.Latin1.stringify(plaintextArray));
     * CryptoJS.enc.Utf8.stringify(plaintextArray));
     * to get Latin1 (binary) or UTF8 string */
}

const decryptedArrayBuffer = decryptWithCryptoJS(data, key, iv);
console.log("Decrypted with CryptoJS [2]:\n");

console.log("\nResult:");
console.log(decryptedArrayBuffer);

console.log("\nResult Latin1:");
console.log(Util.arrayBufferToBinaryString(decryptedArrayBuffer));

console.log("\nResult UTF8:");
console.log(Util.arrayBufferToUtf8String(decryptedArrayBuffer));

console.log("\nResult length: " + decryptedArrayBuffer.length); // `64`, but `61` if uncomment padding specifying (ZeroPadding)


