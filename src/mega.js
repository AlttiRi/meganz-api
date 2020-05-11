const {fetch} = require("./browser-context");
const {Util} = require("./util");
const {MegaUtil} = require("./mega-util");
const {Semaphore} = require("./synchronization");
const GroupedTasks = require("./grouped-tasks");

// todo make `Util.repeatIfErrorAsync` configurable – use not default `count` and `delay` params
class Mega {

    static apiGateway = "https://g.api.mega.co.nz/cs";
    static groupedApiRequest = true;
    static ssl = 2; // Is there a difference between "1" and "2" [???]
    /**
     * Max parallel requests count that Mega allows for API access are `63` within ~4 seconds.
     * If you perform more than 63 connection within ~4 seconds:
     * Fetch error (reason: write EPROTO) will happen (not a big problem, the request will be repeated)
     *
     * Example values: (63, 4000);   (12, 650);   (2, 0);
     */
    static semaphore = new Semaphore(16, 1000);

    /**
     * @extends {GroupedTasks<String, Object, Object>}
     * @private
     */
    static RequestApiGrouped = class extends GroupedTasks {
        async handle(entriesHolder) {
            const url = entriesHolder.key;

            const entries = entriesHolder.pull();
            const payloads = [];
            for (const entry of entries) {
                payloads.push(entry.getValue());
            }

            const responseArray = await Mega.requestApiSafe(url, payloads);
            console.log("[grouped request]", responseArray);

            entries.forEach((entry, index) => {
                entry.resolve(responseArray[index]);
            });
        }
    }
    /** @private */
    static requestApiGrouped = new Mega.RequestApiGrouped();

    /**
     * @param {*} payload
     * @param {*} [searchParams]
     * @param {boolean} [grouped]
     * @returns {Promise<*>} responseData
     */
    static async requestApi(payload, searchParams = {}, grouped = Mega.groupedApiRequest) {
        const _url = new URL(Mega.apiGateway);
        Util.addSearchParamsToURL(_url, searchParams);
        const url = _url.toString();

        if (grouped) {
            return Mega.requestApiGrouped.getResult({
                    key: url,
                    value: payload
                });
        }
        return (await Mega.requestApiSafe(url, [payload]))[0];
    }

    /**
     * Note: If you move `semaphore` inside `requestApi` or `repeatIfErrorAsync`, then in case an error
     * the repeating request will be added at the end of queue of `semaphore`
     * @param {string|URL} url
     * @param {Object[]} payloads
     * @return {Promise<*[]>}
     * @private
     */
    static async requestApiSafe(url, payloads) {
        await Mega.semaphore.acquire();
        try {
            const response = await Util.repeatIfErrorAsync(_ => Mega.requestApiUnsafe(url, payloads));
            return Mega.apiErrorHandler(response); // todo Retry if -3 exception
        } finally { // if an exception happens more than `count` times, or the error code was returned
            Mega.semaphore.release();
        }
    }

    /**
     * Returns an array with one item (multiple request are not implemented), or an error code (number)
     *
     * An exception may be thrown by `fetch`, for example, if you perform to many connections
     * or `json()` when Mega returns an empty string (if the server returns code 500)
     *
     * @param {string|URL} url
     * @param {Object[]} payloads
     * @return {Promise<*[]>}
     * @private
     */
    static async requestApiUnsafe(url, payloads) {
        const response = await fetch(url, {
            method: "post",
            body: JSON.stringify(payloads)
        });

        if (response.status === 500) {
            throw Error("ERR_ABORTED 500 (Server Too Busy)"); // to do not parse the empty string
        } else if (response.status !== 200) {
            console.error("[response.status]", response.status);
        }

        const text = await response.text();
        console.log(text);
        return JSON.parse(text);
    }

    /** @private */
    static apiErrorHandler(response) {
        if (Array.isArray(response)) { //todo for file links it is _in an array_
            return response;
        } else {
            // todo v2 api error response
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
    }

    // ----------------------------------------------------------------

    /**
     * @param {FileAttribute} fileAttribute
     * @param {string} fileAttribute.id - file attribute ID
     * @param {number} fileAttribute.type - file attribute type
     * @return {Promise<string>}
     */
    static async requestFileAttributeDownloadUrl({id, type}) {
        console.log("Request download url...");
        const responseData = await Mega.requestApi({
            "a": "ufa",    // action (command): u [???] file attribute
            "fah": id,     // `h` means handler(hash, id)
            "ssl": Mega.ssl,
            "r": 1         // r [???] – It adds "." in response url (without this dot the url does not work)
        });

        //todo if [{"p":"https://gfs302n203.userstorage.mega.co.nz/.yWdyTeW","p0":"https://gfs270n873.userstorage.mega.co.nz/.Uy96JeV"}]
        return responseData["p"] + "/" + type;
    }


    // todo add semaphore, not more than 31 (included) connections for each url (of bunch)
    //  to test it, use `Thumbnail.getEncryptedBytes(..., false)` <- "false"
    //  in some kind it is implemented in `FileAttributeBytes.DlBytesRequests`
    /**
     * @param {string} url
     * @param {string|string[]} ids
     * @returns {Promise<Uint8Array>} responseBytes
     * @throws ETIMEDOUT, ECONNRESET
     */
    static async requestFileAttributeBytes(url, ids) {
        /** @type Uint8Array */
        let selectedIdsBinary;

        if (Array.isArray(ids)) {
            selectedIdsBinary = new Uint8Array(ids.length * 8);
            for (let i = 0; i < ids.length; i++) {
                selectedIdsBinary.set(MegaUtil.megaBase64ToArrayBuffer(ids[i]), i * 8);
            }
        } else {
            selectedIdsBinary = MegaUtil.megaBase64ToArrayBuffer(ids);
        }

        /** Sometimes it can throw `connect ETIMEDOUT` or `read ECONNRESET` exception */
        const callback = async () => {
            console.log("Downloading content... ");
            const response = await fetch(url, {
                method: "post",
                body: selectedIdsBinary,
                headers: {
                    // It's important for `node-fetch` (Node.js)
                    // But it is not needed in a browser
                    "connection": "keep-alive"
                }
            });
            if (response.status !== 200) {
                console.error("[response.status]", response.status);
            }
            return new Uint8Array(await response.arrayBuffer());
        };
        const responseBytes = await Util.repeatIfErrorAsync(callback);
        console.log("[downloaded]", responseBytes.length, "bytes");
        return responseBytes;
    }

    // ----------------------------------------------------------------

    /**
     * @param {string} shareId
     * @returns {Promise<{size: number, nodeAttributesEncoded: string,
     *           downloadUrl: string, timeLeft: number, EFQ: number, MSD: number, fileAttributesStr?: string}>} nodeInfo
     */
    static async requestNodeInfo(shareId) {
        const responseData = await Mega.requestApi({
            "a": "g",        // Command type
            "p": shareId,    // Content ID
            "g": 1,          // The download link
            //"v": 2,        // Multiple links for big files
            "ssl": Mega.ssl  // HTTPS for the download link
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
    }

    // The logic of nodes order that Mega returns looks like it is:
    // The first node is root node,
    // the next: root node children sorted by creationDate (folders have the same priority as files),
    // the next: nodes (also sorted by creationDate) of each folder,
    //              these folder iterates from last one to the first (like a stack works). And etc.
    //
    // So, a folder node is always located before the nodes that are inside it,       <-- [important]
    // all nodes with the same parent are listed one by one in creationDate order,
    // one level folders iterates in reverse order to `print` their children.
    static async requestFolderInfo(shareId) {
        const responseData = await Mega.requestApi({
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
            sn, // [???][unused] // "McPlUF51ioE" [random]
            noc // [???][unused] // "1"
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
        //console.log("[shareRootNodeId]", shareRootNodeId);


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
    }

}

module.exports = {Mega};