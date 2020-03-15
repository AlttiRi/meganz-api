const { btoa, atob, fetch } = require("./browser-context");

/** @namespace */
const util = {

    utf8Decoder: new TextDecoder(),

    logger: {
        DEBUG: true,
        INFO: true,
        /**
         * @param {*} arguments
         */
        debug() {
            if (!this.DEBUG) {
                return;
            }
            [...arguments].forEach(el => {
                console.log(el);
            });
            console.log();
        },
        /**
         * @param {*} arguments
         */
        info() {
            if (!this.INFO) {
                return;
            }
            [...arguments].forEach(el => {
                console.log(el);
            });
        }
    },

    /**
     * @param {Uint8Array} arrayBuffer
     * @returns {string}
     */
    arrayBufferToUtf8String(arrayBuffer) {
        return this.utf8Decoder.decode(arrayBuffer);
    },

    /**
     * @param {Uint8Array} arrayBuffer
     * @returns {string}
     */
    arrayBufferToHexString(arrayBuffer) {
        return Array.from(arrayBuffer)
            .map(n => ("0" + n.toString(16)).slice(-2))
            .join("");
    },

    /**
     * To binary string (Latin1).
     *
     * NB: A binary string is a string is encoded with "Latin1" ("ISO-8859-1", not "Windows−1252"!).
     * `TextDecoder` does not support decoding "Latin1", "ISO-8859-1".
     * ```
     * const str = new TextDecoder("ISO-8859-1").decode(new Uint8Array([148, 125, 1, 218, 233, 169, 248, 111]));
     * console.log(str[0], str[0].charCodeAt(0)); // "”" 8221 (!)
     * const result = Uint8Array.from(str.split(""), ch => ch.charCodeAt(0));
     * console.log(result);
     * // [29, 125, 1, 218, 233, 169, 248, 111] // 29 (!) (trims `8221` to one byte)
     * ```
     * @param {Uint8Array} arrayBuffer
     * @returns {string} binaryString
     * */
    arrayBufferToBinaryString(arrayBuffer) {
        return String.fromCharCode(...arrayBuffer);
    },


    /**
     * Do not use `new TextEncoder().encode(binaryStr)` for binary (Latin1) strings
     * It maps code points to utf8 bytes (so char codes of 128-255 range maps to 2 bytes, not 1)
     * For example: String.fromCharCode(128) is mapped to [194, 128] bytes
     * @param {string} binaryString
     * @returns {Uint8Array}
     */
    binaryStringToArrayBuffer(binaryString) {
        return Uint8Array.from(binaryString.split(""), ch => ch.charCodeAt(0));
    },

    /**
     * Binary string (Latin1) encoded with Base64 to ArrayBuffer
     * @param {string} base64BinaryString
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
     * @param {Uint8Array} data
     * @param {Uint8Array} key
     * @param {Object} [config]
     * @param {Uint8Array} [config.iv]
     * @param {"CBC"|"CFB"|"CTR"|"OFB",|"ECB"} [config.mode="CBC"]
     * @param {"Pkcs7"|"ZeroPadding"|"NoPadding"|"Iso97971"|"AnsiX923"|"Iso10126"} [config.padding="ZeroPadding"]
     * @returns {Uint8Array}
     */
    decryptAES(data, key, {iv, mode, padding} = {}) {

        const CryptoJS = require("crypto-js"); //todo remove from here

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
         * The convert code [*] is from CryptoJS.enc.Latin1.stringify
         * @see CryptoJS.enc.Latin1 stringify()
         *
         * @param {CryptoJS.lib.WordArray} wordArray
         * @returns {Uint8Array}
         * @private
         */
        const _wordArrayToArrayBuffer = function(wordArray) {
            const bites = [];
            for (let i = 0; i < wordArray.sigBytes; i++) {
                const bite = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff; // [*]
                bites.push(bite);
            }
            return new Uint8Array(bites);
        };

        return _wordArrayToArrayBuffer(plaintextWA);
    },

    /**
     * Save with Node.js API to `temp/` folder
     * @param {Uint8Array} arrayBuffer
     * @param {string} name
     * @param {number|Date} [mtime]
     */
    saveFile(arrayBuffer, name, mtime = new Date()) {
        this.logger.info(`Saving "${name}" file to "temp" folder...`);

        const fs = require("fs");
        fs.mkdirSync("temp", {recursive: true});

        name = name.replace("/", "_");
        fs.writeFileSync("temp/" + name, Buffer.from(arrayBuffer));
        fs.utimesSync("temp/" + name, new Date(), mtime);
    },

    /**
     * Array of bytes (Little-endian) to Long (64-bits) value
     * @param {Uint8Array} arrayBuffer
     * @returns {number}
     */
    arrayBufferToLong(arrayBuffer) {
        const sizeofLong = 8; // in fact max integer value in JS has 7 bytes, see Number.MAX_SAFE_INTEGER

        if (arrayBuffer.length > sizeofLong) {
            throw "Length is over size of Long";
        }

        const result = arrayBuffer.reduce((previousValue, currentValue, index) => {
            return previousValue + currentValue * (256 ** index);
        }, 0);

        if (result > Number.MAX_SAFE_INTEGER) { // > 9007199254740991 === 00 1F FF FF  FF FF FF FF
            throw "Over Number.MAX_SAFE_INTEGER";
        }

        return result;
    },

    /**
     * 1436853891 -> "2015.06.14 09:04:51"
     * @param {number} seconds
     * @returns {string}
     */
    secondsToFormattedString(seconds) {
        const date = new Date(seconds * 1000);

        // Adds zero padding
        function pad(str) {
            return ("0" + str).slice(-2);
        }

        return date.getFullYear() + "." + pad(date.getMonth()) + "." + pad(date.getDate()) + " " +
            pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
    },

    /**
     * Format bytes to human readable format
     * Trims the tailing zeros
     * @link https://stackoverflow.com/a/18650828/11468937
     * @see mega.bytesToSize
     * @param {number} bytes
     * @param {number} [decimals=2]
     * @returns {string}
     */
    bytesToSize(bytes, decimals = 2) {
        if (bytes === 0) {
            return "0 B";
        }
        const k = 1024;
        decimals = decimals < 0 ? 0 : decimals;
        const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
    },

};


module.exports.util = util;