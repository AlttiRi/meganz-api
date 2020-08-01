import {btoa, atob} from "./browser-context.js";

export default class Util {

    /**
     * @param {string} base64
     * @returns {string} binaryString
     */
    static base64ToBinaryString(base64) {
        try {
            return atob(base64);
        } catch (e) {
            console.error("Incorrect Base64:", base64);
            throw e;
        }
    }

    /**
     * @param {string} binaryString
     * @returns {string} base64
     */
    static binaryStringToBase64(binaryString) {
        return btoa(binaryString);
    }

    /**
     * @param {TypedArray|ArrayBuffer|DataView} arrayBuffer
     * @returns {string}
     */
    static arrayBufferToUtf8String(arrayBuffer) {
        return new TextDecoder().decode(arrayBuffer);
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
     * Replaced with `reduce`. It works OK, no need to optimise (like `Util.arrayBufferToHexString()`).
     *
     * Also:
     * new TextDecoder("utf-8").decode(new Uint8Array([128])).charCodeAt(0) === 65533 "�"
     * new TextDecoder("Latin1").decode(new Uint8Array([128])).charCodeAt(0) === 8364 "€"
     * String.fromCharCode(128).charCodeAt(0) === 128 ""
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
     *
     * The current implementation works a bit faster (~13 %) than:
     * `Uint8Array.from(binaryString.split(""), ch => ch.charCodeAt(0))`
     *
     * @param {string} binaryString
     * @returns {Uint8Array} arrayBuffer
     */
    static binaryStringToArrayBuffer(binaryString) {
        const array = new Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            array[i] = binaryString.charCodeAt(i);
        }
        return Uint8Array.from(array);
    }

    /**
     * Binary string (Latin1) encoded with Base64 to ArrayBuffer
     * @param {string} base64
     * @returns {Uint8Array}
     */
    static base64ToArrayBuffer(base64) {
        const binaryString = Util.base64ToBinaryString(base64);
        return Util.binaryStringToArrayBuffer(binaryString);
    }

    /**
     * ArrayBuffer to Base64 encoded binary string (Latin1)
     * @param {Uint8Array} arrayBuffer
     * @returns {string}
     */
    static arrayBufferToBase64(arrayBuffer) {
        const binaryString = Util.arrayBufferToBinaryString(arrayBuffer);
        return Util.binaryStringToBase64(binaryString);
    }

    /**
     * The optimised version
     * @param {TypedArray} arrayBuffer
     * @returns {string}
     */
    static arrayBufferToHexString(arrayBuffer) {
        const byteToHex = Util.ByteToHexTable.get();

        const buffer = new Uint8Array(arrayBuffer.buffer);
        const hexOctets = new Array(buffer.length);

        for (let i = 0; i < buffer.length; i++) {
            hexOctets[i] = byteToHex[buffer[i]];
        }

        return hexOctets.join("");
    }

    /**
     * Allows to get the precomputed hex octets table (the array)
     *
     * `[0]: "00"`
     * ...
     * `[255]: "FF"`
     *
     * It is used only in `Util.arrayBufferToHexString()`. Lazy loading.
     * @private
     */
    static ByteToHexTable = class {
        static get() {
            const self = Util.ByteToHexTable;
            if (!self.inited) {
                self.init();
            }
            return self.byteToHex;
        }
        static byteToHex = [];
        static inited = false;
        static init = () => {
            const self = Util.ByteToHexTable;
            for (let i = 0; i < 256; i++) {
                const hexOctet = i.toString(16).padStart(2, "0");
                self.byteToHex.push(hexOctet);
            }
            self.inited = true;
        }
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
            return str.toString().padStart(2, "0");
        }

        return date.getFullYear() + "." + pad(date.getMonth() + 1) + "." + pad(date.getDate()) + " " +
            pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
    }

    /**
     * Format bytes to human readable format
     * Trims the tailing zeros
     *
     * {@link https://stackoverflow.com/a/18650828/11468937}
     * @see MegaUtil.bytesToSize
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
     * @example
     * await Util.sleep(50);
     *
     * @param {number} ms milliseconds
     * @param {boolean} inNextEventLoopTask - if passed 0 wait for the next event loop task, or no (use micro task)
     * @returns {Promise}
     */
    static sleep(ms, inNextEventLoopTask = false) {  //todo rework (true be default)
        if (ms <= 0) {
            if (inNextEventLoopTask) {
                return Util.nextEventLoopTask();
            } else {
                return Promise.resolve(); // It's not the same thing as using `setImmediate`
            }
        }
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Return a promise that fulfills at the next event loop task
     * Use to split a long time work to multiple tasks
     *
     * @example
     * doWorkPart1();
     * await Util.nextEventLoopTask();
     * doWorkPart2();
     *
     * @returns {Promise}
     */
    static nextEventLoopTask() {
        return new Promise(resolve => {
            Util.setImmediate(resolve);
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
     * @param {function} executable - an async function to repeat if it throws an exception
     * @param {number} count=5 - count of the repeats
     * @param {number} delay=5000 - ms to wait before repeating
     * @return {Promise<*>}
     */
    static async repeatIfErrorAsync(executable, count = 5, delay = 5000) { //todo make `delay` iterable
        for (let i = 0;; i++) {
            try {
                if (i) {
                    console.log("REPEAT");
                }
                return await executable();
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
        //todo implement this:
        // https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file
        if (name.includes("/")) {
            console.log(`Bad filename: "${name}"`); // for debugging currently
        }
        return name.replace("/", "_");
    }
    //todo isSafeName() - the similar method

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

    /**
     * Convert the string to the base64 encoded utf-8 bytes.
     *
     * With default mode "default" it uses `unescape` function that is deprecated now,
     * but it works much faster than converting with "safe" mode (ArrayBuffer -> binaryString -> base64).
     * With "unsafe" mode the sting must be Latin1 encoded, or you get the exception in a browser
     * ("DOMException: Failed to execute 'btoa' on 'Window':
     *     the string to be encoded contains characters outside of the Latin1 range.") or the wrong result in Node.js.
     *
     * For node.js you can use:
     * `Buffer.from(string).toString("base64")`
     *
     * @param {string} string
     * @param {"default"|"safe"|"unsafe"} [mode="default"]
     * @returns {string} base64
     */
    static stringToBase64(string, mode = "default") {
        if (mode === "default") {       // uses deprecated `escape` function
            const binaryString = unescape(encodeURIComponent(string));
            return Util.binaryStringToBase64(binaryString);
        } else if (mode === "safe") {   // works slower (~3x)
            const arrayBuffer = new TextEncoder().encode(string);
            return Util.arrayBufferToBase64(arrayBuffer);
        } else if (mode === "unsafe") { // only for Latin1 within Base64
            return Util.binaryStringToBase64(string);
        }
    }

    /**
     * Convert the Base64 encoded string of utf-8 bytes to the string.
     *
     * @param {string} base64
     * @param {"default"|"safe"|"unsafe"} [mode="default"]
     * @returns {string}
     */
    static base64ToString(base64, mode = "default") {
        if (mode === "default") {       // uses deprecated `escape` function
            const binaryString = Util.base64ToBinaryString(base64);
            return decodeURIComponent(escape(binaryString));
        } else if (mode === "safe") {   // works slower (~x4+)
            const arrayBuffer = Util.base64ToArrayBuffer(base64);
            return new TextDecoder().decode(arrayBuffer);
        } else if (mode === "unsafe") { // only for Latin1 within Base64
            return Util.base64ToBinaryString(base64);
        }
    }

    /**
     * Make ReadableStream iterable
     *
     * @example
     *  for await (const chunk of iterateReadableStream(stream)) {
     *      i++;                 // If you do not want to block event loop.
     *      if (i % 128 === 0) { // Note: it has negative impact for performance: ~7 %, without `if`: ~30 %.
     *          await new Promise(resolve => setImmediate(resolve));
     *      }
     *      handle(chunk);
     * }
     *
     * @template T
     * @param {ReadableStream<T>} stream
     * @returns {AsyncGenerator<T>}
     */
    static async * iterateReadableStream(stream) {
        const reader = stream.getReader();
        while (true) {
            const {done, value} = await reader.read();
            if (done) {
                break;
            }
            yield value;
        }
    }

    //todo in browser-context
    // const {MessageChannel} = require("worker_threads");
    //
    static setImmediate = setImmediate || MessageChannel ? (function() {
        const {port1, port2} = new MessageChannel();
        const queue = [];

        port1.onmessage = function() {
            const callback = queue.shift();
            callback();
        };

        return function(callback) {
            port2.postMessage(null);
            queue.push(callback);
        };
    })() : (callback) => setTimeout(callback, 0);



    // // the experimental version
    // static logger = {
    //     DEBUG: true,
    //     INFO: true,
    //     /**
    //      * @param {*} arguments
    //      */
    //     debug() {
    //         if (!Util.logger.DEBUG) {
    //             return;
    //         }
    //         // rollup says: "A static class field initializer may not contain arguments"
    //         [...arguments].forEach(el => {
    //             console.log(el);
    //         });
    //         console.log();
    //     },
    //     /**
    //      * @param {*} arguments
    //      */
    //     info() {
    //         if (!Util.logger.INFO) {
    //             return;
    //         }
    //         // rollup says: "A static class field initializer may not contain arguments"
    //         [...arguments].forEach(el => {
    //             console.log(el);
    //         });
    //     }
    // };
}