const { btoa, atob, fetch } = require("./browser-context");
const { util } = require("./util");
const logger = util.logger;


// node for share with single file
// todo rework
class Node {

    id;
    decryptionKey;
    isFolder;
    nodeKey;

    size;
    name;
    modificationDate; // Unix time (seconds)
    get modificationDateFormatted() {
        return util.secondsToFormattedString(this.modificationDate);
    }
    get mtime() {    // An alias
        return this.modificationDate;
    }

    fileAttributes;
    /** @returns {Promise<Uint8Array>} */
    getPreview() {
        return mega.requestFileAttributeData(this, 1);
    };
    /** @returns {Promise<Uint8Array>} */
    getThumbnail() {
        return mega.requestFileAttributeData(this, 0);
    };
    //todo add video attributes (8 and 9)
}



const mega = {

    ssl: 2, // Is there a difference between "1" and "2" [???]
    apiGateway: "https://g.api.mega.co.nz/cs",

    /**
     * @param {string} url - URL
     * @returns {{id: string, decryptionKey: string, isFolder: boolean, selectedFolder: string , selectedFile: string}}
     */
    parseUrl(url) {
        const regExp = /(?<=#)(?<isF>F)?!(?<id>[\w-_]+)(!(?<key>[\w-_]+))?(?:!(?<folder>[\w-_]+))?(?:\?(?<file>[\w-_]+))?/;
        const groups = url.match(regExp).groups;

        const isFolder = Boolean(groups.isF);
        /** Content ID */
        const id = groups.id;
        /** Decryption key encoded with Mega's base64 */
        const decryptionKey = groups.key ? groups.key : "";
        const selectedFolder = groups.folder ? groups.folder : "";
        const selectedFile = groups.selectedFile ? groups.selectedFile : "";

        return {id, decryptionKey, isFolder, selectedFolder, selectedFile};
    },

    /**
     * @link https://github.com/gpailler/MegaApiClient/blob/93552a027cf7502292088f0ab25f45eb29ebdc64/MegaApiClient/Cryptography/Crypto.cs#L63
     * @param {Uint8Array} decryptedKey
     * @returns {{iv: Uint8Array, metaMac: Uint8Array, nodeKey: Uint8Array}}
     */
    decryptionKeyToParts(decryptedKey) {

        const iv      = new Uint8Array(decryptedKey.buffer, 16, 8); // todo use `subarray`?
        const metaMac = new Uint8Array(decryptedKey.buffer, 24, 8);

        const nodeKey = new Uint8Array(16);

        // 256 bits -> 128 bits
        for (let i = 0; i < 16; i++) {
            nodeKey[i] = decryptedKey[i] ^ decryptedKey[i + 16];
        }

        return {iv, metaMac, nodeKey};
    },

    /**
     * @param {string} megaBase64
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
     * @param {string} megaBase64EncodedStr
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
     * @param {string} megaBase64EncodedStr
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

    /**
     * @param {string} url
     * @returns {Promise<Node>}
     */
    async getNode(url) {
        const node = new Node();

        logger.info("Parsing URL...");
        const {
            id,
            decryptionKey,
            isFolder,
            selectedFolder, // [unused]
            selectedFile    // [unused]
        } = this.parseUrl(url);
        Object.assign(node, {isFolder, id, decryptionKey});


        logger.info("Decode and parse decryption key...");
        const decryptionKeyDecoded = this.megaBase64ToArrayBuffer(node.decryptionKey);
        const {
            iv,      // [unused][???]
            metaMac, // [unused][???]
            nodeKey
        } = this.decryptionKeyToParts(decryptionKeyDecoded);
        Object.assign(node, {nodeKey});


        logger.info("Fetching JSON with node info...");
        const {
            size,
            nodeAttributesEncoded,
            fileAttributesString,
            downloadUrl, // [unused]
            EFQ,         // [unused]
            MSD          // [unused]
        } = await this.requestNodeInfo(node.id);
        Object.assign(node, {size});


        logger.info("Decryption and parsing node attributes...");
        const {
            name,
            serializedFingerprint
        } = this.parseEncodedNodeAttributes(nodeAttributesEncoded, node.nodeKey);
        Object.assign(node, {name});
        console.log("[nodeAttributesEncoded]", nodeAttributesEncoded);


        logger.info("Decoding and parsing node fingerprint...");
        const {
            modificationDate,
            fileChecksum   // [unused][???]
        } = this.parseFingerprint(serializedFingerprint);
        Object.assign(node, {modificationDate});

        logger.info("Parsing file attributes...");
        const fileAttributes = this.parseFileAttributes(fileAttributesString);
        Object.assign(node, {fileAttributes});


        return node;
    },

    /**
     * @param {*} payload
     * @param {*} [searchParams]
     * @returns {Promise<*>} responseData
     */
    //todo handle bad urls (revoked, banned)
    async requestAPI(payload, searchParams = {}) {
        const url = new URL(this.apiGateway);
        Object.entries(searchParams).forEach(([key, value]) => {
            url.searchParams.append(key, value.toString());
        });

        const response = await fetch(url, {
            method: "post",
            body: JSON.stringify([payload])
        });
        const responseArray = await response.json();
        return responseArray[0];
    },

    /**
     * @param {string} url
     * @param {*} [payload]
     * @returns {Promise<Uint8Array>} responseBytes
     */
    async requestFile(url, payload) {
        const response = await fetch(url, {
            method: "post",
            body: payload,
            headers: {
                // It's important for `node-fetch` (Node.js)
                // But it is not needed in a browser
                "connection": "keep-alive"
            }
        });
        return new Uint8Array(await response.arrayBuffer());
    },



    /**
     * Parses string like this: "924:1*sqbpWSbonCU/925:0*lH0B2ump-G8"
     * @param {string} fileAttributesString
     * @returns {[{hash: string, type: number, plain: number}]}
     */
    parseFileAttributes(fileAttributesString) {
        const fileAttributes = [];

        const chunks = fileAttributesString.split("\/");
        chunks.forEach(chunk => {
            const groups = chunk.match(/(?<plain>\d+):(?<type>\d+)\*(?<hash>.+)/).groups;
            const {hash, type, plain} = groups;
            fileAttributes.push({
                hash,                // [???] Well, name it "hash"
                type:  Number(type),
                plain: Number(plain) // [???] WTF? I have no idea that it is.
            });
        });

        return fileAttributes;
    },

    /**
     * @param {string} serializedFingerprint
     * @returns {{modificationDate: number, fileChecksum: Uint8Array}}
     */
    parseFingerprint(serializedFingerprint) {
        const fingerprintBytes = util.base64BinaryStringToArrayBuffer(serializedFingerprint);

        const fileChecksum    = fingerprintBytes.subarray(0, 16); // 4 CRC32 of the file [unused]
        const timeBytesLength = fingerprintBytes[16];             // === 4, and 5 after 2106.02.07 (06:28:15 UTC on Sunday, 7 February 2106)
        const timeBytes       = fingerprintBytes.subarray(17, 17 + timeBytesLength); // in fact, after this no data is

        // I don't think that it is necessary, but let it be
        if (timeBytesLength > 5) {
            throw "Invalid value: timeBytesLength = " + timeBytesLength;
        }

        const modificationDate = util.arrayBufferToLong(timeBytes);

        return {modificationDate, fileChecksum};
    },

    /**
     * @param {string} attributesEncoded
     * @param {Uint8Array} nodeKey
     * @returns {{name: string, serializedFingerprint: string}}
     */
    parseEncodedNodeAttributes(attributesEncoded, nodeKey) {
        const attributesEncrypted   = util.base64BinaryStringToArrayBuffer(attributesEncoded);
        const attributesArrayBuffer = util.decryptAES(attributesEncrypted, nodeKey);
        const attributesPlane       = util.arrayBufferToUtf8String(attributesArrayBuffer);

        const trimmedAttributesPlaneString = attributesPlane.substring("MEGA".length);
        const {
            n: name,
            c: serializedFingerprint // only for files (not folders)
        } = JSON.parse(trimmedAttributesPlaneString);

        return {name, serializedFingerprint};
    },

    /**
     * @param {string} id
     * @returns {Promise<{size: number, nodeAttributesEncoded: string, fileAttributesString: string,
     *           downloadUrl: string, EFQ: number, MSD: number}>}
     */
    async requestNodeInfo(id) {

        const responseData = await this.requestAPI({
            "a": "g",        // Command type
            "p": id,         // Content ID
            "g": 1,          // The download link
            //"v": 2,        // Multiple links for big files
            "ssl": this.ssl  // HTTPS for the download link
        });

        logger.debug(responseData);

        return {
            size:                  responseData["s"],
            nodeAttributesEncoded: responseData["at"],  // Node attr (name, hash (file fingerprint) -> mtime)
            fileAttributesString:  responseData["fa"],  // File attr (thumbnail, preview) // only for video or image – undefine in the other case
            downloadUrl:           responseData["g"],
            timeLeft:              responseData["tl"],  // time left to wait. 0 seconds if quota is not exceeded
            EFQ:                   responseData["efq"], // Something about the Quota – Quota enforcement [???]
            MSD:                   responseData["msd"]  // "MegaSync download"
            //todo
            // add `TL` (It looks it is the new parameter added at the beginning of March 2020)
            // time to wait of the reset of bandwidth quota
        };
    },

    /**
     * Return thumbnail (type=0) or preview (type=1)
     * @param {Node} node
     * @param {number} type
     * @returns {Promise<Uint8Array>}
     */
    async requestFileAttributeData(node, type) {

        const fileAttribute = node.fileAttributes.find(att => att.type === type);
        const faHash = fileAttribute.hash;
        const faHashBinary = this.megaBase64ToArrayBuffer(faHash);

        logger.info("Request download url...");
        const responseData = await this.requestAPI({
            "a": "ufa",    // action (command): u [???] file attribute
            "fah": faHash,
            "ssl": this.ssl,
            "r": 1         // r [???] – It adds "." in response url (without this dot the url does not work)
        });
        const downloadLink = responseData["p"] + "/" + type;

        logger.info("Downloading content...");
        const responseBytes = await this.requestFile(downloadLink, faHashBinary);

        const hashBytes = responseBytes.subarray(0, 8);  // [unused]
        const wtfBytes  = responseBytes.subarray(8, 12); // [unused][???]
        const atBytes   = responseBytes.subarray(12);

        logger.info("Decryption of downloaded content...");
        return util.decryptAES(atBytes, node.nodeKey);
    },

    /**
     * Format bytes to human readable format like it do Mega.nz
     * {@link https://github.com/meganz/webclient/blob/8e867f2a33766872890c462e2b51561228c056a0/js/functions.js#L298}
     * (Yeah, I have rewrote this)
     * @see util.bytesToSize
     * @param {number} bytes
     * @param {number} [precision]
     * @returns {string}
     */
    bytesToSize(bytes, precision) {
        if (bytes === 0) {
            return "0 B";
        }
        const k = 1024;
        if (precision === undefined) {
            if (bytes > Math.pow(k, 3)) {        // GB
                precision = 2;
            } else if (bytes > Math.pow(k, 2)) { // MB
                precision = 1;
            }
        }
        const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(precision) + " " + sizes[i];
    },

    /**
     * {@link https://github.com/gpailler/MegaApiClient/blob/93552a027cf7502292088f0ab25f45eb29ebdc64/MegaApiClient/Cryptography/Crypto.cs#L33}
     * @param {Uint8Array} encryptedKey a key that need to decrypt
     * @param {Uint8Array} key a key to decrypt with it
     * @returns {Uint8Array} decryptionKey
     */
    decryptKey(encryptedKey, key) {
        const result = new Uint8Array(encryptedKey.length);

        for (let i = 0; i < encryptedKey.length; i += 16) {
            const block = encryptedKey.subarray(i, i + 16);
            const decryptedBlock = util.decryptAES(block, key, {padding: "NoPadding"}); // "NoPadding" – for the case when the last byte is zero (do not trim it)
            result.set(decryptedBlock, i);
        }

        return result;
    },
};

module.exports.mega = mega;