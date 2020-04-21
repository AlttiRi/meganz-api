const {mega} = require("./mega");
const {util} = require("./util");

/**
 * The interface of a media file node
 * @typedef {{fileAttributesStr: string, key?: Uint8Array}} IMediaNodeSimple
 */

/**
 * @typedef IMediaGettersMixin
 * @property {FileAttribute} thumbnail
 * @property {FileAttribute} preview
 * @property {function(): Promise<Uint8Array>} getThumbnail
 * @property {function(): Promise<Uint8Array>} getPreview
 */

/**
 * @typedef {IMediaNodeSimple & IMediaGettersMixin} IMediaNode
 */

/**
 *
 */
class FileAttribute {
    /** @type {string} */
    id;
    /** @type {number} */
    type;
    /** @type {Bunch} */
    bunch;

    /**
     * @param {string} id - `id`, or `handler` as Mega names it
     * @param {number|*} type - 0 – thumbnail, 1 - preview, 8 - ..., 9 - ...
     * @param {number|*} bunch - Attributes with the same bunch number can be requested within one API request
     */
    constructor(id, type, bunch) {
        this.id = id;
        this.type = Number(type);
        this.bunch = Bunch.of(Number(bunch));
    }

    /**
     * @param {boolean} cached=true
     * @return {Promise<string>}
     */
    getDownloadUrl(cached = true) {
        if (!Types.hasBytes(this)){
            return null;
        }
        return this.bunch.getDownloadUrl(this, cached);
    }

    toString() {
        return this.bunch + ":" + this.type + "*" + this.id;
    }
}

class Bunch {
    id;
    #downloadUrl = null;

    /**
     * The holder of the instances of this class.
     * @private
     * @type {Map<number, Bunch>}
     */
    static values = new Map();

    /**
     * Use `of` method to get an instance.
     * @private
     * @param {number} bunch
     */
    constructor(bunch) {
        this.id = Number(bunch);
    }

    toString() {
        return this.id.toString();
    }

    /**
     * @param {number} bunch
     * @return {Bunch}
     */
    static of(bunch) {
        if (Bunch.values.has(bunch)) {
            return Bunch.values.get(bunch);
        }
        const _bunch = new Bunch(bunch);
        Bunch.values.set(bunch, _bunch);
        return _bunch;
    }

    /**
     * @param {FileAttribute} fileAttribute
     * @param {boolean} cached=true
     * @return {Promise<string>}
     */
    async getDownloadUrl(fileAttribute, cached= true) {
        if (cached && this.hasDownloadUrl) {
            return this.downloadUrl;
        }
        const url = await mega.requestFileAttributeDownloadUrl(fileAttribute);
        this.#downloadUrl = url;
        return url;
    }
    get hasDownloadUrl() {
        return Boolean(this.#downloadUrl);
    }
    get downloadUrl() {
        return this.#downloadUrl;
    }
}

class Types {
    static thumbnail = 0;
    static preview   = 1;

    /**
     * @param {FileAttribute} fileAttribute
     * @return {boolean}
     */
    static hasBytes(fileAttribute) {
        return fileAttribute.type === Types.preview || fileAttribute.type === Types.thumbnail;
    }
}

class FileAttributeBytes {
    /** @type {number} */ //todo use Types?
    #type;

    get type() {
        return this.#type;
    }

    constructor(type) {
        this.#type = type;
    }

    /**
     * @param options
     * @param {FileAttribute} [options.fileAttribute]
     * @param {IMediaNode} [options.node]
     * @param {boolean} cached=true - do not request the new URL, if already there is one, experimental use only
     * @return {Promise<string>} downloadUrl
     */
    getDownloadUrl({fileAttribute, node}, cached = true) {
        const _fileAttribute = fileAttribute || FileAttributes.of(node).byType(this.type);
        if (cached) {
            return FileAttributeBytes.DlUrlQueue.getDownloadUrl(_fileAttribute);
        }
        return _fileAttribute.getDownloadUrl(false);
    }

    /** @private */
    static DlUrlQueue = class {

        /**
         * @param {FileAttribute} fileAttribute
         * @return {Promise<string>}
         */
        static getDownloadUrl(fileAttribute) {
            const self = FileAttributeBytes.DlUrlQueue;
            return new Promise(resolve => {
                self.handle(fileAttribute, resolve);
            });
        }

        /** @private
         *  @type Map<String, Function[]> */
        static queue = new Map();

        /** @private */
        static handle(fileAttribute, resolve) {
            const self = FileAttributeBytes.DlUrlQueue;
            const bunch = fileAttribute.bunch;

            if (bunch.hasDownloadUrl) {
                resolve(bunch.downloadUrl);
            } else {
                if (!self.queue.has(bunch.id)) {
                    self.queue.set(bunch.id, []);
                    self.request(fileAttribute).then(/*nothing*/);
                }
                self.queue.get(bunch.id).push(resolve);
            }
        }

        /** @private */
        static async request(fileAttribute) {
            const self = FileAttributeBytes.DlUrlQueue;
            const bunch = fileAttribute.bunch;

            const result = await fileAttribute.getDownloadUrl();

            const resolvers = self.queue.get(bunch.id);
            for (const resolve of resolvers) {
                resolve(result);
            }
            self.queue.delete(bunch.id);
        }
    }

    /**
     * @param options
     * @param {FileAttribute} [options.fileAttribute]
     * @param {string} [options.downloadUrl]
     * @param {IMediaNode} [options.node]
     * @param {boolean} grouped=true - with `false` it may work a bit faster, but extremely increases
     * the connection count – one per each file attribute, currently there is no limitation of connection count
     * in the code (a semaphore), but Mega handles 136 connections at one moment normally
     * @return {Promise<Uint8Array>} encryptedBytes
     */
    async getEncryptedBytes({fileAttribute, downloadUrl, node}, grouped = true) {
        const _fileAttribute = fileAttribute || FileAttributes.of(node).byType(this.type);
        const _downloadUrl = downloadUrl || await this.getDownloadUrl({fileAttribute: _fileAttribute});

        if (grouped) {
            return FileAttributeBytes.DlBytesQueue.getBytes(_downloadUrl, _fileAttribute.id);
        }

        const responseBytes = await mega.requestFileAttributeBytes(_downloadUrl, _fileAttribute.id);

        //todo
     // const idBytes     = responseBytes.subarray(0, 8);
        const lengthBytes = responseBytes.subarray(8, 12); // bytes count – little endian 32 bits integer (enough for up to 4 GB)
        const length      = util.arrayBufferToLong(lengthBytes);
        const dataBytes   = responseBytes.subarray(12, 12 + length); // with zero padding
        console.log(`Encrypted file attribute size is ${length} bytes`);

        return dataBytes;
    }

    //todo max group size
    /** @private */
    static DlBytesQueue = class {
        /** @return {Promise<Uint8Array>} */
        static getBytes(downloadUrl, fileAttributeId) {
            const self = FileAttributeBytes.DlBytesQueue;
            return new Promise(resolve => {
                self.handle({downloadUrl, fileAttributeId}, resolve);
            });
        }

        /** @private
         *  @type Map<String, Map<String, Function[]>> */ // url to <"fileAttributeId" to "resolve"s>
        static queue = new Map();
        /** @private
         *  @type Set<String> */
        static handledUrls = new Set();

        /** @private */
        static handle({downloadUrl, fileAttributeId}, resolve) {
            const self = FileAttributeBytes.DlBytesQueue;

            if (!self.queue.has(downloadUrl)) {
                /** @type Map<String, Function[]> */ // "fileAttrId" to "resolve"s (if the diff nodes have the same fa)
                const faIds = new Map();
                self.queue.set(downloadUrl, faIds);
            }

            const fas = self.queue.get(downloadUrl);
            if (!fas.has(fileAttributeId)) {
                fas.set(fileAttributeId, []);
            }
            fas.get(fileAttributeId).push(resolve);

            self.run(downloadUrl);
        }

        /** @private */
        static run(downloadUrl) {
            const self = FileAttributeBytes.DlBytesQueue;

            if (!self.handledUrls.has(downloadUrl)) {

                function callback() {
                    const map = self.queue.get(downloadUrl); // array of maps (file attr ids to `resolve` function)
                    self.queue.delete(downloadUrl);
                    self.handledUrls.delete(downloadUrl);
                    self.request(downloadUrl, map).then(/*nothing*/);
                }

                // Delay execution with micro task queue
                //Promise.resolve().then(callback);
                // or //
                // Delay execution with event loop queue + delay in ms
                //setTimeout(callback, 10);
                // or //
                // Delay execution with event loop queue
                setImmediate ? setImmediate(callback) : setTimeout(callback, 0);

                self.handledUrls.add(downloadUrl);
            }
        }

        /** @private */
        static async request(downloadUrl, map) {
            const fileAttrIDs = [...map.keys()];

            const responseBytes = await mega.requestFileAttributeBytes(downloadUrl, fileAttrIDs);

            for (let i = 0, offset = 0; i < fileAttrIDs.length; i++) {
                const idBytes     = responseBytes.subarray(offset,      offset +  8);
                const lengthBytes = responseBytes.subarray(offset + 8,  offset + 12);
                const length      = util.arrayBufferToLong(lengthBytes);
                const dataBytes   = responseBytes.subarray(offset + 12, offset + 12 + length);
                const id = mega.arrayBufferToMegaBase64(idBytes);

                const resolvers = map.get(id);
                for (const resolve of resolvers) {
                    resolve(dataBytes);
                }

                offset += 12 + length;
            }
        }
    }

    /**
     * @param options
     * @param {FileAttributes} [options.fileAttributes]
     * @param {Uint8Array} [options.encryptedBytes]
     * @param {IMediaNode} [options.node]
     * @param {string} [options.downloadUrl]
     * @return {Promise<Uint8Array>}
     */
    async getBytes({fileAttributes, encryptedBytes, node, downloadUrl}) {
        const _fileAttributes = fileAttributes || FileAttributes.of(node);
        const fileAttribute = _fileAttributes.byType(this.type);
        const _encryptedBytes = encryptedBytes || await this.getEncryptedBytes({fileAttribute, downloadUrl, node});

        console.log("Decryption of downloaded content...");
        return util.decryptAES(_encryptedBytes, _fileAttributes.nodeKey, {padding: "ZeroPadding"});
    }
}

class FileAttributes {

    /** @type {FileAttribute[]} */
    fileAttributes;
    /** @type {Uint8Array} */
    nodeKey;

    constructor(node) {
        const fileAttributes = [];

        const chunks = node.fileAttributesStr.split("\/");
        chunks.forEach(chunk => {
            const groups = chunk.match(/(?<bunch>\d+):(?<type>\d+)\*(?<id>.+)/).groups;
            const {id, type, bunch} = groups;
            fileAttributes.push(new FileAttribute(id, type, bunch));
        });

        this.fileAttributes = fileAttributes;
        this.nodeKey = node.key || null;
    }

    /** Example output: "924:1*sqbpWSbonCU/925:0*lH0B2ump-G8" */
    toString() {
        return this.fileAttributes.join("/");
    }

    /**
     * Get file attribute by type (0, 1, 8, or 9)
     * @param {number} type
     * @return {FileAttribute}
     */
    byType(type) {
        return this.fileAttributes.find(att => att.type === type);
    }

    // ========

    /** @type {Map<String, FileAttributes>} */
    static values = new Map();

    /**
     * @param {IMediaNode} node
     */
    static add(node) {
        if (!FileAttributes.values.get(node.fileAttributesStr)) {
            FileAttributes.values.set(node.fileAttributesStr, new FileAttributes(node));
        }
    }

    /**
     * @param {IMediaNode} node
     * @return {FileAttributes}
     */
    static get(node) {
        return FileAttributes.values.get(node.fileAttributesStr);
    }

    /**
     * @param {IMediaNode} node
     * @return {FileAttributes}
     */
    static of(node) {
        FileAttributes.add(node);
        return FileAttributes.get(node);
    }

    // ========

    /** Like a static class, but with polymorphism */
    static Thumbnail = new FileAttributeBytes(Types.thumbnail);
    static Preview   = new FileAttributeBytes(Types.preview);

    /**
     * @param {IMediaNode} node
     * @return {Promise<Uint8Array>}
     */
    static getThumbnail(node) {
        return FileAttributes.getAttribute(node, FileAttributes.Thumbnail);
    }
    /**
     * @param {IMediaNode} node
     * @return {Promise<Uint8Array>}
     */
    static getPreview(node) {
        return FileAttributes.getAttribute(node, FileAttributes.Preview);
    }
    //todo cases when node.key === null
    /**
     * NB: can be not only JPG (FF D8 FF (E0)), but PNG (89 50 4E 47 0D 0A 1A 0A) too, for example.
     * https://en.wikipedia.org/wiki/List_of_file_signatures
     *
     * @param {IMediaNode} node
     * @param {FileAttributeBytes} typeClass
     * @return {Promise<Uint8Array>}
     */
    static getAttribute(node, typeClass) {
        const fileAttributes = FileAttributes.of(node);
        return typeClass.getBytes({fileAttributes});
    }

}

module.exports = FileAttributes;