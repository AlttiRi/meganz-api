const { btoa, atob, fetch } = require("./browser-context");
const { util } = require("./util");
const logger = util.logger;
const {Semaphore} = require("./synchronization");


const mega = {

    /**
     * Max parallel requests count that Mega allows for API access are `64`,
     * but the count decreases not instantly.
     * For example, for 64 parallel requests you need to add a delay ~4000+ before realise the semaphore
     * or Fetch error (reason: write EPROTO) will happen (not a big problem, the request will be repeated)
     *
     * Example values:
     * 64, 4000
     * 12, 650
     * 3, 0
     */
    semaphore: new Semaphore(12, 650),

    // todo make `util.repeatIfErrorAsync` configurable – use not default `count` and `delay` params

    ssl: 2, // Is there a difference between "1" and "2" [???]
    apiGateway: "https://g.api.mega.co.nz/cs",

    /**
     * @link https://github.com/gpailler/MegaApiClient/blob/93552a027cf7502292088f0ab25f45eb29ebdc64/MegaApiClient/Cryptography/Crypto.cs#L63
     * @param {Uint8Array} decryptedKey
     * @returns {{iv: Uint8Array, metaMac: Uint8Array, key: Uint8Array}}
     */
    decryptionKeyToParts(decryptedKey) {

        const iv      = decryptedKey.subarray(16, 24);
        const metaMac = decryptedKey.subarray(24, 32);
        const key     = new Uint8Array(16);

        // 256 bits -> 128 bits
        for (let i = 0; i < 16; i++) {
            key[i] = decryptedKey[i] ^ decryptedKey[i + 16];
        }

        return {iv, metaMac, key};
    },

    /**
     * @param {string} megaBase64
     * @returns {Uint8Array}
     */
    megaBase64ToArrayBuffer(megaBase64) {
        const base64 = mega.megaBase64ToBase64(megaBase64);
        return util.base64BinaryStringToArrayBuffer(base64);
    },

    /**
     * Transform Mega Base64 format to normal Base64
     *   "AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk"
     *   ->
     *   "AWJuto8/fhleAI2WG0RvACtKkL/s9tAtvBXXDUp2bQk="
     * @param {string} megaBase64EncodedStr
     * @returns {string}
     */
    megaBase64ToBase64(megaBase64EncodedStr) {

        const paddingLength = mega._getPaddingLengthForMegaBase64(megaBase64EncodedStr);
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
     * @param {*} payload
     * @param {*} [searchParams]
     * @returns {Promise<*>} responseData
     */
    async requestAPI(payload, searchParams = {}) {

        const url = new URL(mega.apiGateway);
        util.addSearchParamsToURL(url, searchParams);

        /**
         * The main function.
         * Represented as a callback to pass it in `_repeatIfErrorAsync`.
         *
         * Returns an array with one item (multiple request are not implemented) or an error code (number)
         *
         * An exception may be thrown by `fetch`, for example, if you perform to much connections
         * or `json()` when Mega returns an empty string (a bug?)
         *
         * @return {Promise<*>}
         */
        const callback = async () => { //todo refactor (move to private method or smth other)
            const response = await fetch(url, {
                method: "post",
                body: JSON.stringify([payload])
            });
            return await response.json();
        };

        await mega.semaphore.acquire();
        try {
            const response = await util.repeatIfErrorAsync(callback);
            if (Array.isArray(response)) {
                return response[0];
            } else {
                // todo create separate method to handle all errors
                // https://mega.nz/doc
                if (response === -9) {
                    throw new Error("ERROR CODE: -9. NOT FOUND");
                } else if (response === -16) {
                    throw new Error("ERROR CODE: -16. USER IS BLOCKED");
                } else if (response === -3) {
                    throw new Error("ERROR CODE: -3. AGAIN");
                    //  A temporary congestion or server malfunction prevented your request from being processed.
                    //  No data was altered. Retry.
                    //  Retries must be spaced with exponential backoff. //todo
                } else {
                    throw new Error("ERROR CODE: " + response); // `response` is a number like this: `-9`
                }
            }
        } finally { // if an exception happens more than `count` times, or the error code was returned
            mega.semaphore.release();
        }
    },

    /**
     * @param {FileAttribute} fileAttribute
     * @param {string} fileAttribute.id - file attribute ID
     * @param {number} fileAttribute.type - file attribute type
     * @return {Promise<string>}
     */
    async requestFileAttributeDownloadUrl({id, type}) {
        console.log("Request download url...");
        const responseData = await mega.requestAPI({
            "a": "ufa",    // action (command): u [???] file attribute
            "fah": id,     // `h` means handler(hash, id)
            "ssl": mega.ssl,
            "r": 1         // r [???] – It adds "." in response url (without this dot the url does not work)
        });

        return responseData["p"] + "/" + type;
    },

    // todo add semaphore (the new one) or is it OK without it? [???]
    //  need to test it later
   /**
     * @param {string} url
     * @param {string} id
     * @returns {Promise<Uint8Array>} responseBytes
     */
   async requestFileAttribute(url, id) {
       const idBinary = mega.megaBase64ToArrayBuffer(id);

        /** Sometimes it can throw `connect ETIMEDOUT` or `read ECONNRESET` exception */
        const callback = async () => {
            console.log("Downloading content...");
            const response = await fetch(url, {
                method: "post",
                body: idBinary,
                headers: {
                    // It's important for `node-fetch` (Node.js)
                    // But it is not needed in a browser
                    "connection": "keep-alive"
                }
            });
            return new Uint8Array(await response.arrayBuffer());
        };
        return await util.repeatIfErrorAsync(callback);
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
        const attributesArrayBuffer = util.decryptAES(attributesEncrypted, nodeKey, {padding: "ZeroPadding"});
        const attributesPlane       = util.arrayBufferToUtf8String(attributesArrayBuffer);

        const trimmedAttributesPlaneString = attributesPlane.substring("MEGA".length);
        const {
            n: name,
            c: serializedFingerprint // only for files (not folders)
        } = JSON.parse(trimmedAttributesPlaneString);

        return {name, serializedFingerprint};
    },

    /**
     * @param {string} shareId
     * @returns {Promise<{size: number, nodeAttributesEncoded: string,
     *           downloadUrl: string, timeLeft: number, EFQ: number, MSD: number, fileAttributesStr?: string}>} nodeInfo
     */
    async requestNodeInfo(shareId) {

        const responseData = await mega.requestAPI({
            "a": "g",        // Command type
            "p": shareId,    // Content ID
            "g": 1,          // The download link
            //"v": 2,        // Multiple links for big files
            "ssl": mega.ssl  // HTTPS for the download link
        });
        //console.log("[responseData]", responseData);

        const prettyResponse = {
            size:                  responseData["s"],
            nodeAttributesEncoded: responseData["at"],  // Node attributes (name, hash (file fingerprint) -> mtime)

            // If "g" is specified:
            downloadUrl:           responseData["g"],
            timeLeft:              responseData["tl"],  // Time to wait of the reset of bandwidth quota.
                                                        // `0` seconds if quota is not exceeded
                                                        // (It looks it is the new parameter added
                                                        //                             at the beginning of March 2020)
            // Useless properties: [unused]
            EFQ:                   responseData["efq"], // `1` – Something about the Quota – Quota enforcement?  [???]
            MSD:                   responseData["msd"]  // `1` – "MegaSync download"                             [???]
        };

        if (responseData["fa"]) {
            // File attributes (a thumbnail, a preview, [a video meta info])
            // Only for an image or a video
            prettyResponse.fileAttributesStr = responseData["fa"];
        }

        return prettyResponse;
    },

    // The logic of nodes order that Mega returns looks like it is:
    // The first node is root node,
    // the next: root node children sorted by creationDate (folders have the same priority as files),
    // the next: nodes (also sorted by creationDate) of each folder,
    //              these folder iterates from last one to the first (like a stack works). And etc.
    //
    // So, a folder node is always located before the nodes that are inside it,       <-- [important]
    // all nodes with the same parent are listed one by one in creationDate order,
    // one level folders iterates in reverse order to `print` their children.
    async requestFolderInfo(shareId) {
        const responseData = await mega.requestAPI({
            "a": "f",
            "r":  1, // Recursive (include sub folders/files) // if not set only root node and 1th lvl file/folder nodes
            "c":  1, // [???][useless]
            "ca": 1, // [???][useless]
        }, {
            "n": shareId
        });
        //console.log("[responseData]", responseData);

        const {
            f: rawNodes, // array of file and folder nodes
            sn, // [???][unused] // "1"
            noc // [???][unused] // "McPlUF51ioE" [random]
        } = responseData;


        function _getShareRootNodeId(rawNodes) {
            // Every node has a prefix in its `k` value – `shareRootNodeId:decryptionKey`
            const firstNode = rawNodes[0];
            const id = firstNode["k"].match(/^[^:]+/)[0];

            // In fact the first node is the share root
            // Recheck:
            if (id !== firstNode["h"]) {
                console.warn("ShareRootNodeId does not equal to id of the first node.");
            }

            return id;
        }

        const shareRootNodeId = _getShareRootNodeId(rawNodes);
        //logger.debug("[shareRootNodeId]", shareRootNodeId);


        function _prettifyType(type) {
            switch (type) {
                case  0: return "file";
                case  1: return "folder";
                default: return type;
            }
        }

        function _parseKeyFromNode(node) {
            const decryptionKeyStr = node["k"];
            // a missing key (an empty string), it's very rarely, but it can be
            if (decryptionKeyStr === "") {
                console.log("A missed key!", node);
                return null;
            }
            return decryptionKeyStr.match(/(?<=:)[\w-_]+/)[0];
        }

        function _prettifyNodes(rawNodes) {
            return rawNodes.map(node => {
                const prettyNode = {
                    id: node["h"],
                    parentId: node["p"],
                    ownerId: node["u"],
                    type: _prettifyType(node["t"]),
                    attributes: node["a"],
                    decryptionKeyStr: _parseKeyFromNode(node), // from node["k"]
                    creationDate: node["ts"], // (timestamp)
                };
                if (prettyNode.type === "file") {
                    prettyNode.size = node["s"];
                    if (node["fa"]) { // only for images and videos
                        prettyNode.fileAttributesStr = node["fa"];
                    }
                }
                return prettyNode;
            });
        }

        return {nodes: _prettifyNodes(rawNodes), rootId: shareRootNodeId};
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

module.exports = {mega};