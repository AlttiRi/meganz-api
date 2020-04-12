const {mega} = require("./mega");
const {util} = require("./util");

class FileAttribute {
    /** @type {string} */
    id;
    /** @type {number} */
    type;
    /** @type {number} */
    bunch;

    /**
     * @param {string} id - `id`, or `handler` as Mega names it
     * @param {number|*} type - 0 – thumbnail, 1 - preview
     * @param {number|*} bunch - Attributes with the same bunch number can be requested within one API request
     */
    constructor(id, type, bunch) {
        this.id = id;
        this.type = Number(type);
        this.bunch = Number(bunch);
    }
    toString() {
        return this.bunch + ":" + this.type + "*" + this.id;
    }
}

class FileAttributeBytes {
    /** @type {number} */
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
     * @param {{fileAttributesStr: string, key: Uint8Array}} [options.node]
     * @return {Promise<string>} downloadUrl
     */
    getDownloadUrl({fileAttribute, node}) {
        const _fileAttribute = fileAttribute || FileAttributes.of(node).byType(this.type);
        return mega.requestFileAttributeDownloadUrl(_fileAttribute);
    }

    /**
     * @param options
     * @param {FileAttribute} [options.fileAttribute]
     * @param {string} [options.downloadUrl]
     * @param {{fileAttributesStr: string, key: Uint8Array}} [options.node]="null"
     * @return {Promise<Uint8Array>} encryptedBytes
     */
    async getEncryptedBytes({fileAttribute, downloadUrl, node}) {
        const _fileAttribute = fileAttribute || FileAttributes.of(node).byType(this.type);
        const _downloadUrl = downloadUrl || await this.getDownloadUrl({fileAttribute: _fileAttribute});
        const responseBytes = await mega.requestFileAttribute(_downloadUrl, _fileAttribute.id);

        const idBytes     = responseBytes.subarray(0, 8);  // [unused] // todo: verify (maybe useful for bunched data)
        const lengthBytes = responseBytes.subarray(8, 12); // bytes count – little endian 32 bits integer (enough for up to 4 GB)
        const length      = util.arrayBufferToLong(lengthBytes);
        const dataBytes   = responseBytes.subarray(12, 12 + length);
        console.log(`Encrypted file attribute size is ${length} bytes`); // with zero padding

        return dataBytes;
    }

    /**
     * @param options
     * @param {FileAttributes} [options.fileAttributes]
     * @param {Uint8Array} [options.encryptedBytes]
     * @param {{fileAttributesStr: string, key: Uint8Array}} [options.node]
     * @param {string} [options.downloadUrl]
     * @return {Promise<Uint8Array>}
     */
    async getBytes({fileAttributes, encryptedBytes, node, downloadUrl}) {
        const _fileAttributes = fileAttributes || FileAttributes.of(node);
        const fileAttribute = _fileAttributes.byType(this.type);
        const _encryptedBytes = encryptedBytes || await this.getEncryptedBytes({fileAttribute, downloadUrl});

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
        this.nodeKey = node.key;
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
     * @param {{fileAttributesStr: string, key: Uint8Array}} node
     */
    static add(node) {
        if (!FileAttributes.values.get(node.fileAttributesStr)) {
            FileAttributes.values.set(node.fileAttributesStr, new FileAttributes(node));
        }
    }

    /**
     * @param {{fileAttributesStr: string, key: Uint8Array}} node
     * @return {FileAttributes}
     */
    static get(node) {
        return FileAttributes.values.get(node.fileAttributesStr);
    }

    /**
     * @param {{fileAttributesStr: string, key: Uint8Array}} node
     * @return {FileAttributes}
     */
    static of(node) {
        FileAttributes.add(node);
        return FileAttributes.get(node);
    }

    // ========

    /** Like a static class, but with polymorphism */
    static Thumbnail = new FileAttributeBytes(0);
    static Preview   = new FileAttributeBytes(1);

    /**
     * @param {{fileAttributesStr: string, key: Uint8Array}} node
     * @return {Promise<Uint8Array>}
     */
    static getThumbnail(node) {
        return FileAttributes.getAttribute(node, FileAttributes.Thumbnail);
    }
    /**
     * @param {{fileAttributesStr: string, key: Uint8Array}} node
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
     * @param {{fileAttributesStr: string, key: Uint8Array}} node
     * @param {FileAttributeBytes} typeClass
     * @return {Promise<Uint8Array>}
     */
    static getAttribute(node, typeClass) {
        const fileAttributes = FileAttributes.of(node);
        return typeClass.getBytes({fileAttributes});
    }


    static getThumbnails(nodes) {
        //todo
    }
    static getPreviews(nodes) {
        //todo
    }


}

module.exports = FileAttributes;