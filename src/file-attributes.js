import Util from "./util.js";
import Crypto from "./crypto.js";
import MegaUtil from "./mega-util.js";
import Mega from "./mega.js";
import GroupedTasks from "./grouped-tasks.js";
import {Semaphore} from "./synchronization.js";

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
    /** @type {Number} */
    id;

    downloadUrl = null;

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
    async getDownloadUrl(fileAttribute, cached = true) {
        if (cached && this.hasDownloadUrl) {
            return this.downloadUrl;
        }
        const url = await Mega.requestFileAttributeDownloadUrl(fileAttribute);
        //todo urls
        this.downloadUrl = url;
        return url;
    }
    get hasDownloadUrl() {
        return Boolean(this.downloadUrl);
    }
    get downloadUrl() {
        return this.downloadUrl;
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
    type;

    get type() {
        return this.type;
    }

    constructor(type) {
        this.type = type;
    }

    /**
     * @extends {GroupedTasks<Number, FileAttribute, String>}
     */
    static DlUrlRequests = class extends GroupedTasks {
        async handle(entriesHolder) {
            const fileAttribute = entriesHolder.first.getValue();
            const result = await fileAttribute.getDownloadUrl();

            for (const entry of entriesHolder.pull()) {
                entry.resolve(result);
            }
        }

        /** @type {Class<!GroupedTasks.SimpleEntry<Number, FileAttribute, String>>} */
        static RequestDlUrlEntry = class extends GroupedTasks.SimpleEntry {
            /** @return {boolean} */
            needHandle() {
                return !this.getValue().bunch.hasDownloadUrl;
            }
            /** @return {String} */
            getResult() {
                return this.getValue().bunch.downloadUrl;
            }
            /** @return {number} */
            getKey() {
                return this.getValue().bunch.id;
            }
        }
    }
    static dlUrlRequests = new FileAttributeBytes.DlUrlRequests({
        entryClass: FileAttributeBytes.DlUrlRequests.RequestDlUrlEntry,
        delayStrategy: GroupedTasks.execute.now
    });

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
            return FileAttributeBytes.dlUrlRequests.getResult({
                    value: _fileAttribute
                });
        }
        return _fileAttribute.getDownloadUrl(false);
    }

    /**
     * Split a grouped request (of file attribute bytes) to grouped requests of 16 requests in each.
     * Up to 16 parallel downloading for a chunk.
     * @extends {GroupedTasks<String, String, Uint8Array>}
     */
    static DlBytesRequests = class extends GroupedTasks {
        async handle(entriesHolder) {
            const downloadUrl = entriesHolder.key;

            const semaphore = new Semaphore(16); // do not use more than 31
            for (const entries of entriesHolder.parts(16)) { // use `0` to disable splitting
                semaphore.sync(() => {
                    return this.handlePart(downloadUrl, entries);
                }).then(/*ignore promise*/);
            }
        }

        /** @private */
        async handlePart(downloadUrl, entries) {
            /**
             * Maps fileAttributeId to resolves
             * (different nodes may have the same file attribute)
             * @type {Map<string, Resolve[]>}
             */
            const map = new Map();

            for (const entry of entries) {
                const fileAttributeId = entry.getValue();
                if (!map.has(fileAttributeId)) {
                    map.set(fileAttributeId, []);
                }
                map.get(fileAttributeId).push(entry.resolve);
            }

            const fileAttrIDs = [...map.keys()];
            const generator = FileAttributeBytes.fileAttributeBytes(downloadUrl, fileAttrIDs);
            for await (const {id, dataBytes} of generator) {
                const resolvers = map.get(id);
                for (const resolve of resolvers) {
                    resolve(dataBytes);
                }
            }
        }
    }
    static dlBytesRequests = new FileAttributeBytes.DlBytesRequests();

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
            return FileAttributeBytes.dlBytesRequests.getResult({
                key: _downloadUrl,
                value: _fileAttribute.id
            });
        }

        const responseBytes = await Mega.requestFileAttributeBytes(_downloadUrl, _fileAttribute.id);
        return FileAttributeBytes.parseBytes(responseBytes).dataBytes;
    }

    /**
     * @param {string} downloadUrl
     * @param {string[]} fileAttrIDs
     * @return {AsyncGenerator<{dataBytes: Uint8Array, id: string}>}
     */
    static async *fileAttributeBytes(downloadUrl, fileAttrIDs) {
        const responseBytes = await Mega.requestFileAttributeBytes(downloadUrl, fileAttrIDs);

        for (let i = 0, offset = 0; i < fileAttrIDs.length; i++) {
            const {id, dataBytes} = FileAttributeBytes.parseBytes(responseBytes, offset);
            yield {id, dataBytes};
            offset += 12 + dataBytes.length;
        }
    }

    /** @private */
    static parseBytes(bytes, offset = 0) {
        const idBytes     = bytes.subarray(offset,      offset +  8);
        const lengthBytes = bytes.subarray(offset + 8,  offset + 12);
        const length      = Util.arrayBufferToLong(lengthBytes);
        const dataBytes   = bytes.subarray(offset + 12, offset + 12 + length);
        const id          = MegaUtil.arrayBufferToMegaBase64(idBytes);
        return {id, dataBytes};
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

        if (!_fileAttributes.nodeKey) {
            if (FileAttributes.strictMode) {
                throw "No key specified for the file attribute decryption.";
            } else {
                console.log("No key specified for the file attribute decryption. Skipping the decryption.");
                return _encryptedBytes;
            }
        }
        console.log("Decryption of a file attribute...");
        return Crypto.decryptAES(_encryptedBytes, _fileAttributes.nodeKey, {padding: "ZeroPadding"});
    }
}

export default class FileAttributes {

    /**
     * If `false` (default) returns not decrypted file attribute if no node key specified.
     * If `true` `FileAttributes.getBytes` will throw the exception.
     *
     * @type {boolean}
     */
    static strictMode = false;

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