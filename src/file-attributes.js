const { mega } = require("./mega");
const { util } = require("./util");
const {Semaphore} = require("./synchronization");

class FileAttributes {
    /**
     * @type {Map<String, FileAttribute[]>}
     */
    static values = new Map();

    static thumbnailType = 0;
    static previewType   = 1;
    static semaphore = new Semaphore(); // 63 max, but care about pauses

    //todo
    static async of(nodes) {

    }

    static async getThumbnail(node) {
        return FileAttributes.getAttribute(node, FileAttributes.thumbnailType);
    }

    static async getPreview(node) {
        return FileAttributes.getAttribute(node, FileAttributes.previewType);
    }

    //todo semaphore for limiting api requests (up to 63 connections, + delay 4 seconds)
    //
    // NB: can be not only JPG (FF D8 FF (E0)), but PNG (89 50 4E 47 0D 0A 1A 0A) too, for example.
    // https://en.wikipedia.org/wiki/List_of_file_signatures
    //todo cases when node.nodeKey === null
    static async getAttribute(node, type) {
        if (!FileAttributes.values.get(node.fileAttributes)) { //todo rename to `node.fileAttributesStr`
            FileAttributes.values.set(node.fileAttributes, parseFileAttributes(node.fileAttributes))
        }
        const fileAttributes = FileAttributes.values.get(node.fileAttributes);

        const fileAttribute = fileAttributes.find(att => att.type === type);

        await FileAttributes.semaphore.acquire(); //todo move it to `mega`
        try {
            const responseBytes = await requestFileAttributeBytes(fileAttribute);

            const idBytes     = responseBytes.subarray(0, 8);  // [unused] // todo: verify (may be useful for bunched data)
            const lengthBytes = responseBytes.subarray(8, 12); // bytes count – little endian 32 bit integer (enough for up to 4 GB)
            const length      = util.arrayBufferToLong(lengthBytes);
            const dataBytes   = responseBytes.subarray(12, 12 + length);

            console.log("Attribute (enc) size is " + length + " bytes"); // with zero padding

            console.log("Decryption of downloaded content...");
            return util.decryptAES(dataBytes, node.nodeKey);
        } catch (e) {  //todo move it to `mega`
            console.error(e);
            await util.sleep(9000); // todo make it a parameter
            return FileAttributes.getAttribute(node, type); // recursion // todo rework, add retry count
        } finally {
            await FileAttributes.semaphore.release();
        }

    }
}

//todo move to `mega`
/**
 * Returns a thumbnail (type === 0) or a preview (type === 1)
 * @param {FileAttribute} fileAttribute
 * @returns {Promise<Uint8Array>} responseBytes – encrypted bytes
 */
async function requestFileAttributeBytes(fileAttribute) {

    const type = fileAttribute.type;
    const id   = fileAttribute.id;
    const idBinary = mega.megaBase64ToArrayBuffer(id);

    console.log("Request download url...");
    const responseData = await mega.requestAPI({
        "a": "ufa",    // action (command): u [???] file attribute
        "fah": id,     // `h` means handler(hash, id)
        "ssl": mega.ssl,
        "r": 1         // r [???] – It adds "." in response url (without this dot the url does not work)
    });
    const downloadLink = responseData["p"] + "/" + type;

    console.log("Downloading content...");
    return await mega.requestFile(downloadLink, idBinary);
}


/**
 * Parses string like this: "924:1*sqbpWSbonCU/925:0*lH0B2ump-G8"
 * @param {string} fileAttributesString
 * @returns {FileAttribute[]}
 */
function parseFileAttributes(fileAttributesString) {
    const fileAttributes = [];

    const chunks = fileAttributesString.split("\/");
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

module.exports = FileAttributes;