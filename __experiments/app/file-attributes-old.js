import MegaApi from "../../src/mega-api.js";
import Util from "../../src/util.js";
import Crypto from "../../src/crypto.js";


export default class FileAttributes {

    static thumbnailType = 0;
    static previewType   = 1;

    /**
     * @type {Map<String, FileAttribute[]>}
     * @private
     */
    static values = new Map();

    /**
     * @param {string} fileAttributesStr
     */
    static add(fileAttributesStr) {
        if (!FileAttributes.values.get(fileAttributesStr)) {
            FileAttributes.values.set(fileAttributesStr, parseFileAttributes(fileAttributesStr))
        }
    }

    /**
     * @param {string} fileAttributesStr
     * @return {FileAttribute[]}
     */
    static get(fileAttributesStr) {
        return FileAttributes.values.get(fileAttributesStr);
    }

    /**
     * @param {string} fileAttributesStr
     * @return {FileAttribute[]}
     */
    static of(fileAttributesStr) {
        FileAttributes.add(fileAttributesStr);
        return FileAttributes.get(fileAttributesStr);
    }

    /**
     * @return {Promise<Uint8Array>}
     */
    static async getThumbnail(node) {
        return FileAttributes.getAttribute(node, FileAttributes.thumbnailType);
    }

    /**
     * @return {Promise<Uint8Array>}
     */
    static async getPreview(node) {
        return FileAttributes.getAttribute(node, FileAttributes.previewType);
    }


    /**
     * NB: can be not only JPG (FF D8 FF (E0)), but PNG (89 50 4E 47 0D 0A 1A 0A) too, for example.
     * https://en.wikipedia.org/wiki/List_of_file_signatures
     *
     * @param {SharedMediaFileNode|MediaFileNode} node
     * @param {number} type
     * @return {Promise<Uint8Array>}
     */
    static async getAttribute(node, type) {

        const fileAttributes = FileAttributes.of(node.fileAttributesStr);
        const fileAttribute = fileAttributes.find(att => att.type === type);

        const responseBytes = await requestFileAttributeEncrypted(fileAttribute);

        const idBytes     = responseBytes.subarray(0, 8);  // [unused]
        const lengthBytes = responseBytes.subarray(8, 12); // bytes count – little endian 32 bits integer (enough for up to 4 GB)
        const length      = Util.arrayBufferToLong(lengthBytes);
        const dataBytes   = responseBytes.subarray(12, 12 + length);

        console.log(`Encrypted file attribute size is ${length} bytes`); // with zero padding

        console.log("Decryption of downloaded content...");
        return Crypto.decryptAES(dataBytes, node.key, {padding: "ZeroPadding"});
    }
}


/**
 * Returns a thumbnail (type === 0), or a preview (type === 1)
 * @param {FileAttribute} fileAttribute
 * @returns {Promise<Uint8Array>} responseBytes – encrypted bytes
 */
async function requestFileAttributeEncrypted(fileAttribute) {
    const downloadLink = await MegaApi.requestFileAttributeDownloadUrl(fileAttribute);
    return MegaApi.requestFileAttributeBytes(downloadLink, fileAttribute.id);
}


/**
 * Parses string like this: "924:1*sqbpWSbonCU/925:0*lH0B2ump-G8"
 * @param {string} fileAttributesStr
 * @returns {FileAttribute[]}
 */
function parseFileAttributes(fileAttributesStr) {
    const fileAttributes = [];

    const chunks = fileAttributesStr.split("\/");
    chunks.forEach(chunk => {
        const groups = chunk.match(/(?<bunch>\d+):(?<type>\d+)\*(?<id>.+)/).groups;
        const {id, type, bunch} = groups;
        fileAttributes.push(new FileAttribute(id, type, bunch));
    });

    return fileAttributes;
}


class FileAttribute {
    id;    // `id`, `hash` or `handler` (as Mega names it)
    type;  // 0 – thumbnail, 1 - preview
    bunch; // Attributes with the same bunch number can be requested within one API request
    constructor(id, type, bunch) {
        Object.assign(this, {
            id,
            type:  Number(type),
            bunch: Number(bunch)
        })
    }
    toString() {
        return this.bunch + ":" + this.type + "*" + this.id;
    }
}