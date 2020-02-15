const { util } = require("./util");

module.exports.mega = {

    /**
     * @param url {string} - URL
     * @returns {{isFolder: boolean, id: string, decryptionKeyEncoded: string, selectedFolder: string , selectedFile: string}}
     */
    parseUrl(url) {
        const regExp = /(?<=#)(?<isF>F)?!(?<id>.+)!(?<key>.+)(?:!?(?<folder>.+))?(?:\??(?<file>.+))?/;
        const groups = url.match(regExp).groups;

        const isFolder = Boolean(groups.isF);
        /** Content ID */
        const id = groups.id;
        /** Decryption key encoded with Mega's base64 */
        const decryptionKeyEncoded = groups.key;
        const selectedFolder = groups.folder ? groups.folder : "";
        const selectedFile = groups.selectedFile ? groups.selectedFile : "";

        return { isFolder, id, decryptionKeyEncoded, selectedFolder, selectedFile };
    },

    /**
     * @param decryptedKey {Uint8Array}
     * @returns {{iv: Uint8Array, metaMac: Uint8Array, nodeKey: Uint8Array}}
     */
    decryptionKeyToParts(decryptedKey) {

        const iv      = new Uint8Array(decryptedKey.buffer, 16, 8);
        const metaMac = new Uint8Array(decryptedKey.buffer, 24, 8);

        const nodeKey = new Uint8Array(16);

        for (let idx = 0; idx < 16; idx++) {
            nodeKey[idx] = decryptedKey[idx] ^ decryptedKey[idx + 16];
        }

        return {iv, metaMac, nodeKey};
    },

    /**
     * @param megaBase64 {string}
     * @returns {Uint8Array}
     */
    megaBase64ToArrayBuffer(megaBase64) {
        const base64 = this.megaBase64ToBase64(megaBase64);
        return util.base64BinaryStringToArrayBuffer(base64);
    },

    /**
     * Transform Mega Base64 format to normal Base64
     *   "AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk" ->
     *   "AWJuto8/fhleAI2WG0RvACtKkL/s9tAtvBXXDUp2bQk="
     * @param megaBase64EncodedStr {string}
     * @returns {string}
     */
    megaBase64ToBase64(megaBase64EncodedStr) {

        const paddingLength = this._getPaddingLengthForMegaBase64(megaBase64EncodedStr);
        let result = megaBase64EncodedStr + "=".repeat(paddingLength);

        result = result.replace(/-/g, "+")
                       .replace(/_/g, "/");

        return result;
    },

    /**
     * @param megaBase64EncodedStr {string}
     * @returns {number}
     * @private
     */
    _getPaddingLengthForMegaBase64(megaBase64EncodedStr) {

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
    },

};