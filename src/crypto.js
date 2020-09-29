// import {default as CryptoJS} from "crypto-es";      // or
// import CryptoJS from "./dependencies/crypto-es.js"; // or
import {CryptoJS} from "./dependencies/all.js";

export default class Crypto {
    /**
     * Decrypt AES with `CryptoJS` (Upd: CryptoES)
     *
     * Modes: "CBC" (the default), "CFB", "CTR", "OFB", "ECB".
     *
     * Padding schemes: "Pkcs7" (the default), "ZeroPadding", "NoPadding", "Iso97971", "AnsiX923", "Iso10126".
     *
     * Default IV is zero filled ArrayBuffer.
     *
     * @param {Uint8Array} data
     * @param {Uint8Array} key
     * @param {Object} [config]
     * @param {Uint8Array} [config.iv]
     * @param {"CBC"|"CFB"|"CTR"|"OFB",|"ECB"} [config.mode="CBC"]
     * @param {"Pkcs7"|"ZeroPadding"|"NoPadding"|"Iso97971"|"AnsiX923"|"Iso10126"} [config.padding="Pkcs7"]
     * @returns {Uint8Array}
     */
    static decryptAES(data, key, {iv, mode, padding} = {}) {

        /** Default parameters initialization */
        iv = iv || new Uint8Array(key.length);
        mode = mode || "CBC";
        padding = padding || "Pkcs7";

        /**
         * The convert code [*] is from "crypto-js/lib-typedarrays.js" file
         * Note: a "word" is a 32 bits big-endian signed integer
         *
         * @param {Uint8Array} u8Array // todo use "u8Array" name in other files
         * @returns {CryptoES.lib.WordArray} wordArray
         * @private
         */
        const _arrayBufferToWordArray = function(u8Array) { // todo: remove in the next commit
            const length = Math.trunc(u8Array.length / 4) + (u8Array.length % 4 ? 1 : 0); // "round up" // todo Math.ceil
            const words = new Array(length);
            for (let i = 0; i < u8Array.length; i++) {
                words[i >>> 2] |= u8Array[i] << (24 - (i % 4) * 8); // [*]
            }
            return CryptoJS.lib.WordArray.create(words, u8Array.length); // the passing ArrayBuffer works only with CryptoES, not CryptoJS
        };

        /**
         * Works more than x3-8 faster! but dependent of the endianness. only little-endian.
         * @param {Uint8Array} u8Array
         */
        const _arrayBufferToWordArray2 = function(u8Array) { // todo: remove in the next commit
            const length = Math.trunc(u8Array.length / 4) + (u8Array.length % 4 ? 1 : 0);
            // Note: Uint8Array may be a presentation just of a part of the buffer [!]
            const u32array = new Int32Array(u8Array.buffer, u8Array.byteOffset, length);
            const words = new Array(u32array.length);
            for (let i = 0; i < words.length; i++) { // 255 === 0b00000000_00000000_00000000_11111111
                words[i] = ((u32array[i] >> 0 & 255) << 24) | ((u32array[i] >> 8 & 255) << 16) | ((u32array[i] >> 16 & 255) << 8) | ((u32array[i] >> 24 & 255) << 0);
            }
            return CryptoJS.lib.WordArray.create(words, u8Array.length);
        };

        /**
         * A bit slower than v2 (~10 %), but independent of the endianness
         * @param {Uint8Array} u8Array
         */
        const _arrayBufferToWordArray3 = function(u8Array) { // todo: remove in the next commit
            const length = Math.trunc(u8Array.length / 4) + (u8Array.length % 4 ? 1 : 0);
            const words = new Array(length);
            for (let i = 0; i < length; i++) {
                words[i] = (u8Array[i*4] << 24) | (u8Array[i*4+1] << 16) | (u8Array[i*4+2] << 8) | (u8Array[i*4+3] << 0);
            }
            return CryptoJS.lib.WordArray.create(words, u8Array.length);
        };


        /**
         * THE BEST
         *
         * Faster 5-9 times than old one. (x5 for zeros, x9+ for random values)
         *
         * Endianness independent.
         * @param {Uint8Array} u8Array
         */
        const _arrayBufferToWordArray4 = function(u8Array) {
            const length = Math.trunc(u8Array.length / 4) + (u8Array.length % 4 ? 1 : 0);
            const view = new DataView(u8Array.buffer, u8Array.byteOffset, u8Array.byteLength);
            const words = new Array(length);
            for (let i = 0; i < length; i++) {
                words[i] = view.getInt32(i * 4, false);
            }
            return CryptoJS.lib.WordArray.create(words, u8Array.byteLength);
        };

        const _data = _arrayBufferToWordArray4(data);
        const _key = _arrayBufferToWordArray4(key);
        const _iv = _arrayBufferToWordArray4(iv);
        const plaintextWA = CryptoJS.AES.decrypt( /* (CipherParamsData, WordArray, IBlockCipherCfg) (for CryptoJS) */
            {
                ciphertext: _data
            },
            _key,
            {
                iv: _iv,
                mode: CryptoJS.mode[mode],
                padding: CryptoJS.pad[padding]
            }
        );

        /**
         * The convert code [*] is from CryptoJS.enc.Latin1.stringify ("crypto-js/core.js")
         * See CryptoJS.enc.Latin1 stringify()
         * Note: "word" is a 32 bits big-endian signed integer
         *
         * @param {CryptoES.lib.WordArray} wordArray
         * @returns {Uint8Array}
         * @private
         */
        const _wordArrayToArrayBuffer = function(wordArray) { // todo: remove in the next commit
            const u8Array = new Uint8Array(wordArray.sigBytes);
            for (let i = 0; i < wordArray.sigBytes; i++) {
                u8Array[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff; // [*]
            }
            return u8Array;
        };
        // THE BEST: 4 times faster
        const _wordArrayToArrayBuffer2 = function(wordArray) {
            const {words, sigBytes} = wordArray;
            const arrayBuffer = new ArrayBuffer(words.length * 4);
            const view = new DataView(arrayBuffer);
            for (let i = 0; i < words.length; i++) {
                view.setInt32(i * 4, words[i], false);
            }
            return new Uint8Array(arrayBuffer, 0, sigBytes);
        };

        return _wordArrayToArrayBuffer2(plaintextWA);
    }
}