const {CryptoJS} = require("./dependencies");

class Crypto {
    /**
     * Decrypt AES with `CryptoJS`
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
         * Note: "word" is a 32 bits big-endian signed integer
         *
         * @param {Uint8Array} arrayBuffer
         * @returns {CryptoJS.lib.WordArray} wordArray
         * @private
         */
        const _arrayBufferToWordArray = function(arrayBuffer) {
            const length = Math.trunc(arrayBuffer.length / 4) + (arrayBuffer.length % 4 ? 1 : 0); // "round up"
            const words = new Array(length);
            for (let i = 0; i < arrayBuffer.length; i++) {
                words[i >>> 2] |= arrayBuffer[i] << (24 - (i % 4) * 8); // [*]
            }
            return CryptoJS.lib.WordArray.create(words, arrayBuffer.length);
        };

        const _data = _arrayBufferToWordArray(data);
        const _key = _arrayBufferToWordArray(key);
        const _iv = _arrayBufferToWordArray(iv);
        const plaintextWA = CryptoJS.AES.decrypt( // (CipherParamsData, WordArray, IBlockCipherCfg)
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
         * @see CryptoJS.enc.Latin1 stringify()
         * Note: "word" is a 32 bits big-endian signed integer
         *
         * @param {CryptoJS.lib.WordArray} wordArray
         * @returns {Uint8Array}
         * @private
         */
        const _wordArrayToArrayBuffer = function(wordArray) {
            const bites = new Uint8Array(wordArray.sigBytes);
            for (let i = 0; i < wordArray.sigBytes; i++) {
                bites[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff; // [*]
            }
            return bites;
        };

        return _wordArrayToArrayBuffer(plaintextWA);
    }
}

module.exports = {Crypto};