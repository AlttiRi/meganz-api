const { btoa, atob, fetch } = require("./browser-context");

/** @namespace */
const util = {

    DEBUG: true,
    utf8Decoder: new TextDecoder(),

    /**
     * @param arguments {*}
     */
    log() {
        if (!this.DEBUG) {
            return;
        }
        [...arguments].forEach(el => {
            console.log(el);
        });
        console.log();
    },

    /**
     * @param arrayBuffer {Uint8Array}
     * @returns {string}
     */
    arrayBufferToUtf8String(arrayBuffer) {
        return this.utf8Decoder.decode(arrayBuffer);
    },

    /**
     * @param arrayBuffer {Uint8Array}
     * @returns {string}
     */
    arrayBufferToHexString(arrayBuffer) {
        return Array.from(arrayBuffer)
            .map(n => ("0" + n.toString(16)).slice(-2))
            .join("");
    },

    /** To binary string (Latin1)
     * @param arrayBuffer {Uint8Array}
     * @returns {string}
     * */
    arrayBufferToBinaryString(arrayBuffer) {
        return String.fromCharCode(...arrayBuffer);
    },


    /**
     * Do not use `new TextEncoder().encode(binaryStr)` for binary (Latin1) strings
     * It maps code points to utf8 bytes (so char codes of 128-255 range maps to 2 bytes, not 1)
     * For example: String.fromCharCode(128) is mapped to [194, 128] bytes
     * @param binaryString {string}
     * @returns {Uint8Array}
     */
    binaryStringToArrayBuffer(binaryString) {
        return Uint8Array.from(binaryString.split(""), ch => ch.charCodeAt(0));
    },

    /**
     * Binary string (Latin1) encoded with Base64 to ArrayBuffer
     * @param base64BinaryString {string}
     * @returns {Uint8Array}
     */
    base64BinaryStringToArrayBuffer(base64BinaryString) {
        const binaryString = atob(base64BinaryString);
        return this.binaryStringToArrayBuffer(binaryString);
    },

    /**
     * Decrypt AES with `CryptoJS`
     *
     * Modes: "CBC" (the default), "CFB", "CTR", "OFB", "ECB".
     *
     * Padding schemes: "Pkcs7", "ZeroPadding" (the default), "NoPadding", "Iso97971", "AnsiX923", "Iso10126".
     * NB! "ZeroPadding" is the default padding only for this project.
     *
     * Default IV is zero filled ArrayBuffer.
     *
     * @param data {Uint8Array}
     * @param key {Uint8Array}
     * @param iv {Uint8Array}
     * @param mode {string}
     * @param padding {string}
     * @returns {Uint8Array}
     */
    decryptAES(data, key, { iv, mode, padding } = {}) {

        const CryptoJS = require("crypto-js");

        /** Default parameters initialization */
        iv = iv || new Uint8Array(key.length);
        mode = mode || "CBC";
        padding = padding || "ZeroPadding";


        const _data = this.arrayBufferToBinaryString(data);
        const _key = this.arrayBufferToBinaryString(key);
        const _iv = this.arrayBufferToBinaryString(iv);

        const plaintextWA = CryptoJS.AES.decrypt(
            {
                ciphertext: CryptoJS.enc.Latin1.parse(_data)
            },
            CryptoJS.enc.Latin1.parse(_key),
            {
                iv: CryptoJS.enc.Latin1.parse(_iv),
                mode: CryptoJS.mode[mode],
                padding: CryptoJS.pad[padding]
            }
        );

        /**
         * From CryptoJS.enc.Latin1.stringify code
         * @param wordArray {CryptoJS.lib.WordArray}
         * @returns {Uint8Array}
         * @private
         */
        const _wordArrayToArrayBuffer = function(wordArray) {
            let bites = [];
            for (let i = 0; i < wordArray.sigBytes; i++) {
                const bite = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                bites.push(bite);
            }
            return new Uint8Array(bites);
        };

        return _wordArrayToArrayBuffer(plaintextWA);
    },

    /**
     * Save with Node.js API to `temp/` folder
     * @param arrayBuffer {Uint8Array}
     * @param name {string}
     */
    saveFile(arrayBuffer, name) {
        const fs = require("fs");
        fs.mkdirSync("temp", { recursive: true });

        name = name.replace("/", "_");
        fs.writeFileSync("temp/" + name, Buffer.from(arrayBuffer));
    }

};



util.log = util.log.bind(util);

module.exports.util = util;