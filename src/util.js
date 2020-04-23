const {btoa, atob, fetch} = require("./browser-context");
const {CryptoJS} = require("./libs");

/** @namespace */
class Util {

    static utf8Decoder = new TextDecoder();

    // the experimental version
    static logger = {
        DEBUG: true,
        INFO: true,
        /**
         * @param {*} arguments
         */
        debug() {
            if (!Util.logger.DEBUG) {
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
            if (!Util.logger.INFO) {
                return;
            }
            [...arguments].forEach(el => {
                console.log(el);
            });
        }
    };

    /**
     * @param {string} base64
     * @returns {string} binaryString
     */
    static base64ToBinaryString(base64) {
        return atob(base64);
    }

    /**
     * @param {string} binaryString
     * @returns {string} base64
     */
    static binaryStringToBase64(binaryString) {
        return btoa(binaryString);
    }

    /**
     * @param {Uint8Array} arrayBuffer
     * @returns {string}
     */
    static arrayBufferToUtf8String(arrayBuffer) {
        return Util.utf8Decoder.decode(arrayBuffer);
    }

    /**
     * @param {Uint8Array} arrayBuffer
     * @returns {string}
     */
    static arrayBufferToHexString(arrayBuffer) {
        return Array.from(arrayBuffer)
            .map(n => ("0" + n.toString(16)).slice(-2))
            .join("");
    }

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
     * UPD:
     * Well, it works not so good as I expected
     * ```
     * String.fromCharCode(...new Uint8Array(125830)) // OK
     * String.fromCharCode(...new Uint8Array(125831)) // RangeError: Maximum call stack size exceeded
     * ```
     * Replaced with `reduce`.
     *
     * @param {Uint8Array} arrayBuffer
     * @returns {string} binaryString
     * */
    static arrayBufferToBinaryString(arrayBuffer) {
        return arrayBuffer.reduce((accumulator, byte) => accumulator + String.fromCharCode(byte), "");
    }


    /**
     * Do not use `new TextEncoder().encode(binaryStr)` for binary (Latin1) strings
     * It maps code points to utf8 bytes (so char codes of 128-255 range maps to 2 bytes, not 1)
     * For example: String.fromCharCode(128) is mapped to [194, 128] bytes
     * @param {string} binaryString
     * @returns {Uint8Array}
     */
    static binaryStringToArrayBuffer(binaryString) {
        return Uint8Array.from(binaryString.split(""), ch => ch.charCodeAt(0));
    }

    /**
     * Binary string (Latin1) encoded with Base64 to ArrayBuffer
     * @param {string} base64BinaryString
     * @returns {Uint8Array}
     */
    static base64BinaryStringToArrayBuffer(base64BinaryString) {
        const binaryString = Util.base64ToBinaryString(base64BinaryString);
        return Util.binaryStringToArrayBuffer(binaryString);
    }

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

        const _data = Util.arrayBufferToBinaryString(data);
        const _key = Util.arrayBufferToBinaryString(key);
        const _iv = Util.arrayBufferToBinaryString(iv);

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
    }

    /**
     * Save with Node.js API to `temp/` folder
     * @param {Uint8Array} arrayBuffer
     * @param {string} name
     * @param {number|Date} [mtime]
     * @param {string[]} [path] - array of folders names
     */
    static saveFile(arrayBuffer, name, mtime = new Date(), path = []) {
        const safePath = path.map(Util.getSafeName);
        const pathStr = "temp/" + (safePath.length ? safePath.join("/") + "/" : "");
        console.log(`Saving "${name}" file to "${pathStr}" folder...`);

        const fs = require("fs");
        fs.mkdirSync(pathStr, {recursive: true});

        const safeName = Util.getSafeName(name);

        fs.writeFileSync(pathStr + safeName, Buffer.from(arrayBuffer));
        fs.utimesSync(pathStr + safeName, new Date(), mtime);
    }

    /**
     * Array of bytes (Little-endian) to Long (64-bits) value
     * @param {Uint8Array} arrayBuffer
     * @returns {number}
     */
    static arrayBufferToLong(arrayBuffer) {
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
    }

    /**
     * 1436853891 -> "2015.07.14 09:04:51"
     * @param {number} seconds
     * @returns {string}
     */
    static secondsToFormattedString(seconds) {
        const date = new Date(seconds * 1000);

        // Adds zero padding
        function pad(str) {
            return ("0" + str).slice(-2);
        }

        return date.getFullYear() + "." + pad(date.getMonth() + 1) + "." + pad(date.getDate()) + " " +
            pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
    }

    /**
     * Format bytes to human readable format
     * Trims the tailing zeros
     * @link https://stackoverflow.com/a/18650828/11468937
     * @see Mega.bytesToSize
     * @param {number} bytes
     * @param {number} [decimals=2]
     * @returns {string}
     */
    static bytesToSize(bytes, decimals = 2) {
        if (bytes === 0) {
            return "0 B";
        }
        const k = 1024;
        decimals = decimals < 0 ? 0 : decimals;
        const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
    }

    /**
     * @param {number} ms milliseconds
     * @param {boolean} inNextEventLoopTask - if passed 0 wait for the next event loop task, or no (use micro task)
     * @returns {Promise}
     */
    static sleep(ms, inNextEventLoopTask = false) {
        if (ms === 0) {
            if (inNextEventLoopTask) {
                return Promise.resolve(); // It's not the same thing as using `setImmediate`
            } else {
                return Util.nextEventLoopTask();
            }
        }
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Return promise that fulfills at the next event loop task
     * @returns {Promise}
     */
    static nextEventLoopTask() {
        return new Promise(resolve => {
            if (setImmediate) {
                return setImmediate(resolve);
            }
            // todo create the good implementation with postMessage (for the browsers)
            return setTimeout(resolve, 0); // in fact, it's 4 ms, not 0.
        });
    }

    /**
     * Transforms an object like this: `{"n": "e1ogxQ7T"}` to `"n=e1ogxQ7T"`
     * and adds it to the url as search params. The example result: `${url}?n=e1ogxQ7T`.
     *
     * @param {URL} url
     * @param {Object} searchParams
     */
    static addSearchParamsToURL(url, searchParams) {
        Object.entries(searchParams).forEach(([key, value]) => {
            url.searchParams.append(key, value.toString());
        });
    }

    /**
     * @param {function} callback - an async function to repeat if it throws an exception
     * @param {number} count=5 - count of the repeats
     * @param {number} delay=5000 - ms to wait before repeating
     * @return {Promise<*>}
     */
    static async repeatIfErrorAsync(callback, count = 5, delay = 5000) {
        for (let i = 0;; i++) {
            try {
                return await callback();
            } catch (e) {
                console.error(e, `ERROR! Will be repeated. The try ${i + 1} of ${count}.`);
                if (i < count) {
                    await Util.sleep(delay);
                } else {
                    throw e;
                }
            }
        }
    }

    /**
     * @param {string} name
     * @return {string}
     */
    static getSafeName(name) {
        //todo
        // https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file
        //todo isSafeName
        if (name.includes("/")) {
            console.log(`Bad filename: "${name}"`); // for debugging currently
        }
        return name.replace("/", "_");
    }

    /**
     * The simple implementation
     * @param {Array|TypedArray} array1
     * @param {Array|TypedArray} array2
     * @return {boolean}
     */
    static compareArrays(array1, array2) {
        if (array1.length === array2.length) {
            for (let i = 0; i < array1.length; i++) {
                if (array1[i] !== array2[i]) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
}


module.exports = {Util};