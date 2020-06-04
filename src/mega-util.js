import Util from "./util.js";
import Crypto from "./crypto.js";

/**
 * The class contains Mega specific static util methods.
 */
export default class MegaUtil {

    /**
     * @param {string} attributesEncoded
     * @param {Uint8Array} nodeKey
     * @returns {{name: string, serializedFingerprint: string}}
     */
    static parseEncodedNodeAttributes(attributesEncoded, nodeKey) {
        const attributesEncrypted   = MegaUtil.megaBase64ToArrayBuffer(attributesEncoded);
        const attributesArrayBuffer = Crypto.decryptAES(attributesEncrypted, nodeKey, {padding: "ZeroPadding"});
        const attributesPlane       = Util.arrayBufferToUtf8String(attributesArrayBuffer);

        const trimmedAttributesPlaneString = attributesPlane.substring("MEGA".length);
        const {
            n: name,
            c: serializedFingerprint // Only for files (not folders)
        } = JSON.parse(trimmedAttributesPlaneString);

        return {name, serializedFingerprint};
    }

    /**
     * @param {string} serializedFingerprint
     * @returns {{modificationDate: number, fileChecksum: Uint8Array}}
     */
    static parseFingerprint(serializedFingerprint) {
        const fingerprintBytes = Util.base64BinaryStringToArrayBuffer(serializedFingerprint);

        const fileChecksum    = fingerprintBytes.subarray(0, 16); // 4 CRC32 of the file [unused]
        const timeBytesLength = fingerprintBytes[16];             // === 4, and 5 after 2106.02.07 (06:28:15 UTC on Sunday, 7 February 2106)
        const timeBytes       = fingerprintBytes.subarray(17, 17 + timeBytesLength); // in fact, after this no data is

        // I don't think that it is necessary, but let it be
        if (timeBytesLength > 5) {
            throw "Invalid value: timeBytesLength = " + timeBytesLength;
        }

        const modificationDate = Util.arrayBufferToLong(timeBytes);

        return {modificationDate, fileChecksum};
    }

    /**
     * {@link https://github.com/gpailler/MegaApiClient/blob/93552a027cf7502292088f0ab25f45eb29ebdc64/MegaApiClient/Cryptography/Crypto.cs#L63}
     * @param {Uint8Array} decryptedKey
     * @returns {{iv: Uint8Array, metaMac: Uint8Array, key: Uint8Array}}
     */
    static decryptionKeyToParts(decryptedKey) {
        const iv      = decryptedKey.subarray(16, 24);
        const metaMac = decryptedKey.subarray(24, 32);
        const key     = new Uint8Array(16);

        // 256 bits -> 128 bits
        for (let i = 0; i < 16; i++) {
            key[i] = decryptedKey[i] ^ decryptedKey[i + 16];
        }

        return {iv, metaMac, key};
    }

    /**
     * {@link https://github.com/gpailler/MegaApiClient/blob/93552a027cf7502292088f0ab25f45eb29ebdc64/MegaApiClient/Cryptography/Crypto.cs#L33}
     * @param {Uint8Array} encryptedKey a key that need to decrypt
     * @param {Uint8Array} key a key to decrypt with it
     * @returns {Uint8Array} decryptionKey
     */
    static decryptKey(encryptedKey, key) {
        const result = new Uint8Array(encryptedKey.length);

        for (let i = 0; i < encryptedKey.length; i += 16) {
            const block = encryptedKey.subarray(i, i + 16);
            const decryptedBlock = Crypto.decryptAES(block, key, {padding: "NoPadding"}); // "NoPadding" – for the case when the last byte is zero (do not trim it)
            result.set(decryptedBlock, i);
        }

        return result;
    }

    // ----------------------------------------------------------------

    /**
     * Transform Mega Base64 format to normal Base64
     *   "AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk"
     *   ->
     *   "AWJuto8/fhleAI2WG0RvACtKkL/s9tAtvBXXDUp2bQk="
     * @param {string} megaBase64EncodedStr
     * @returns {string}
     */
    static megaBase64ToBase64(megaBase64EncodedStr) {
        /** @param {string} megaBase64EncodedStr
         *  @returns {number}
         *  @private  */
        function _getPaddingLengthForMegaBase64(megaBase64EncodedStr) {
            /**
             * Base64 padding's length is "1", "2" or "0" because of the "block" size has at least "2" chars.
             * So a string's length is multiple of "4".
             * Check the tables:
             *     https://en.wikipedia.org/wiki/Base64#Examples
             */
            const paddingLength = (4 - megaBase64EncodedStr.length % 4) % 4;
            if (paddingLength === 3) {
                throw {name: "IllegalArgumentException", message: "Wrong Mega Base64 string"};
            }
            return paddingLength;
        }

        const paddingLength = _getPaddingLengthForMegaBase64(megaBase64EncodedStr);
        const result = megaBase64EncodedStr + "=".repeat(paddingLength);
        return result.replace(/-/g, "+")
                     .replace(/_/g, "/");
    }

    /**
     * @param {string} megaBase64
     * @returns {Uint8Array}
     */
    static megaBase64ToArrayBuffer(megaBase64) {
        const base64 = MegaUtil.megaBase64ToBase64(megaBase64);
        return Util.base64BinaryStringToArrayBuffer(base64);
    }

    /**
     * @param {string} base64EncodedStr
     * @return {string}
     */
    static base64ToMegaBase64(base64EncodedStr) {
        return base64EncodedStr.replace(/=/g,  "")
                               .replace(/\+/g, "-")
                               .replace(/\//g, "_");
    }

    /**
     * @param {Uint8Array} arrayBuffer
     * @return {string}
     */
    static arrayBufferToMegaBase64(arrayBuffer) {
        const binaryString = Util.arrayBufferToBinaryString(arrayBuffer);
        const base64 = Util.binaryStringToBase64(binaryString);
        return MegaUtil.base64ToMegaBase64(base64);
    }

    /**
     * @param {string} megaBase64
     * @returns {string}
     */
    static megaBase64ToBinaryString(megaBase64) {
        const base64 = MegaUtil.megaBase64ToBase64(megaBase64);
        return Util.base64ToBinaryString(base64);
    }

    // ----------------------------------------------------------------

    /**
     * Format bytes to human readable format like it do Mega.nz
     * {@link https://github.com/meganz/webclient/blob/8e867f2a33766872890c462e2b51561228c056a0/js/functions.js#L298}
     *
     * (Yeah, I have rewrote this)
     * @see Util.bytesToSize
     * @param {number} bytes
     * @param {number} [decimals]
     * @returns {string}
     */
    static bytesToSize(bytes, decimals) {
        if (bytes === 0) {
            return "0 B";
        }
        const k = 1024;
        if (!decimals) {
            if (bytes > Math.pow(k, 3)) {        // GB
                decimals = 2;
            } else if (bytes > Math.pow(k, 2)) { // MB
                decimals = 1;
            }
        }
        const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(decimals) + " " + sizes[i];
    }
}