const {mega} = require("./mega");
const {util} = require("./util");
const FileAttributes = require("./file-attributes");

class Share {
    /** @type {string} */
    id;
    /** @type {string} */
    decryptionKeyStr;
    /** @type {boolean} */
    isFolder;
    /** @type {string} */
    selectedFolderId;
    /** @type {string} */
    selectedFileId;

    /**
     * @private
     * @param {{
     *    id: string,
     *    decryptionKeyStr?: string,
     *    isFolder?: boolean,
     *    selectedFolderId?: string,
     *    selectedFileId?: string
     *  }} shareParts
     */
    constructor(shareParts) {
        Object.assign(this, shareParts);
    }

    /** @return {string} */
    toString() {
        return "" +
            "[id]               " + this.id               + "\n" +
            "[decryptionKeyStr] " + this.decryptionKeyStr + "\n" +
            "[isFolder]         " + this.isFolder         + "\n" +
            "[selectedFolderId] " + this.selectedFolderId + "\n" +
            "[selectedFileId]   " + this.selectedFileId   + "\n" +
            "[url]              " + this.getUrl()         + "\n" +
            "[url-legacy]       " + this.getUrl(true);
    }

    /**
     * @param {string|URL} url - URL
     * @return {boolean}
     */
    static isFolder(url) {
        return Share.fromUrl(url).isFolder;
    }

    /** @return {string} */
    get selectedId() {
        return this.selectedFileId || this.selectedFolderId || null;
    }

    /**
     * @see URLS
     * @param {string|URL} url - URL
     * @returns {Share}
     */
    static fromUrl(url) {
        const _url = url.toString(); // if passed a URL object
        const isLegacyURL = /#F!|#!/;
        let regExp;

        if (_url.match(isLegacyURL)) {
            regExp = /(?<type>(?<isFolder>#F!)|(?<isFile>#!))(?<id>[\w-_]+)(?<keyPrefix>!(?=[\w-_]{22,43})|!(?=[!?])|!(?![\w-_]{8}))?(?<key>(?<=!)[\w-_]{22,43})?(?<selected>((?<selectedFilePrefix>\?)|(?<selectedFolderPrefix>!?))((?<file>(?<=\?)[\w-_]+)|(?<folder>(?<=!)[\w-_]+)))?/;
        } else {
            regExp = /(?<type>(?<isFolder>folder\/)|(?<isFile>file\/))(?<id>[\w-_]+)(?<keyPrefix>#)?(?<key>(?<=#)[\w-_]{22,43})?(?<selected>((?<selectedFilePrefix>\/file\/)|(?<selectedFolderPrefix>\/folder\/))((?<file>(?<=\/file\/)[\w-_]+)|(?<folder>(?<=\/folder\/)[\w-_]+)))?/;
        }

        const groups = _url.match(regExp).groups;

        const isFolder = Boolean(groups.isFolder);
        /** Content ID */
        const id = groups.id;
        /** Decryption key encoded with Mega's base64 */
        const decryptionKeyStr = groups.key    || "";
        const selectedFolderId = groups.folder || "";
        const selectedFileId   = groups.file   || "";

        return new Share({id, decryptionKeyStr, isFolder, selectedFolderId, selectedFileId});
    }

    /**
     * @param shareParts
     * @param {string}   shareParts.id
     * @param {string}  [shareParts.decryptionKeyStr=""]
     * @param {boolean} [shareParts.isFolder=false]
     * @param {string}  [shareParts.selectedFolderId=""]
     * @param {string}  [shareParts.selectedFileId=""]
     * @return {Share}
     */
    static fromParts({id, decryptionKeyStr = "", isFolder = false, selectedFolderId = "", selectedFileId = ""}) {
        return new Share({id, decryptionKeyStr, isFolder, selectedFolderId, selectedFileId});
    }

    /**
     * Returns the url string for a share.
     * I prefer to use the key separator when there is no key, but there is a selected node.
     * Note: `Share.fromUrl(url).getUrl()` may not be equal to `url` (even for the same format)
     *
     * @see URLS
     * @param {boolean} oldFormat
     * @returns {string}
     */
    getUrl(oldFormat = false) {
        let result;
        const prefixes = {
            folder:    oldFormat ? "#F" : "folder",
            file:      oldFormat ? "#"  : "file",
            id:        oldFormat ? "!"  : "/",
            key:       oldFormat ? "!"  : "#",
            selFile:   oldFormat ? "?"  : "/file/",
            selFolder: oldFormat ? "!"  : "/folder/",
        };

        let selected = "";
        if (this.selectedFileId) {
            selected = prefixes.selFile + this.selectedFileId;
        } else if (this.selectedFolderId) {
            selected = prefixes.selFolder + this.selectedFolderId;
        }

        result = "https://mega.nz/" +
            (this.isFolder ? prefixes.folder : prefixes.file) +
            prefixes.id + this.id +
            (this.decryptionKeyStr ? prefixes.key + this.decryptionKeyStr : "") +
            (selected && !this.decryptionKeyStr ? prefixes.key + selected : selected);

        return result;
    }
}

//todo the most basic class with [Symbol.toStringTag]: "MegaNode"

class BasicFolderShareNode {
    constructor(node, masterKey) {
        this.id           = node.id;
        this.parentId     = node.parentId;
        this.parent       = node.parent || null;
        this.ownerId      = node.ownerId;
        this.creationDate = node.creationDate;

        if (masterKey && node.decryptionKeyStr) {
            const decryptionKeyEncrypted = mega.megaBase64ToArrayBuffer(node.decryptionKeyStr);
            this.#decryptionKey = mega.decryptKey(decryptionKeyEncrypted, masterKey);
        } else {
            this.#decryptionKey = null;
        }
    }
    type;
    id;
    parentId;
    parent;
    ownerId;
    creationDate;
    #decryptionKey;

    get key() {
        return this.#decryptionKey;
    };
    name; // [requires key]

    /**
     * Returns the array of parents names from the root node
     * @return {string[]}
     */
    get path() {
        if (this.parent) {
            return [...this.parent.path, this.parent.name];
        }
        return [];
    }

    /** @return {RootFolderNode} */
    get root() {
        return this.parent.type === "rootFolder" ? this.parent : this.parent.root;
    }
}

class FileNode extends BasicFolderShareNode {
    constructor(node, masterKey) {
        super(node, masterKey);
        this.type = "file";
        this.size = node.size;

        if (masterKey && node.decryptionKeyStr) {
            const {
                name,
                serializedFingerprint
            } = mega.parseEncodedNodeAttributes(node.attributes, this.key);
            this.name = name;

            const {
                modificationDate,
                fileChecksum      // [unused][???]
            } = mega.parseFingerprint(serializedFingerprint);
            this.modificationDate = modificationDate;
        } else {
            this.name = this.modificationDate = null;
        }
    }
    size;

    #keyParts;
    get key() {
        if (!this.#keyParts) {
            if (super.key) {
                this.#keyParts = mega.decryptionKeyToParts(super.key);
            } else {
                this.#keyParts = {iv: null, metaMac: null, key: null};
            }
        }
        return this.#keyParts.key;
    };
    modificationDate;   // [requires key]
    get mtime() {       // An alias
        return this.modificationDate;
    }
    get modificationDateFormatted() {
        return util.secondsToFormattedString(this.modificationDate);
    }

    get downloadUrl() { // not implemented
        return null;
    }
}

// todo: add file attribute support for 8, 9 (9 may not exists)
class MediaFileNode extends FileNode {
    constructor(node, masterKey) {
        super(node, masterKey);
        this.type = "mediaFile";
        this.fileAttributesStr = node.fileAttributesStr;
    }
    fileAttributesStr; // [requires key]

    //todo mixin for it
    /** @returns {Promise<Uint8Array>} */
    getThumbnail() {
        return FileAttributes.getThumbnail(this);
    };
    /** @returns {Promise<Uint8Array>} */
    getPreview() {
        return FileAttributes.getPreview(this);
    };
}

class FolderNode extends BasicFolderShareNode {
    constructor(node, masterKey) {
        super(node, masterKey);
        this.type = "folder";

        if (masterKey) {
            const {
                name
            } = mega.parseEncodedNodeAttributes(node.attributes, this.key);
            this.name = name;
        } else {
            this.name = null;
        }
    }
    folders = [];
    files = [];

    #size = 0;
    get size() {
        return this.#size; // todo: recursive calculate the size
    };
}

class RootFolderNode extends FolderNode {
    constructor(node, masterKey) {
        super(node, masterKey);
        this.type = "rootFolder";
    }
    /** @return {RootFolderNode} */
    get root() {
        return this;
    }
}


class SharedFileNode {
    constructor(share, nodeInfo) {
        this.type = "sharedFile";
        this.id = share.id; // in fact it is not real file node id (for every new generated share url you get new id)

        if (share.decryptionKeyStr) {
            const decryptionKey = mega.megaBase64ToArrayBuffer(share.decryptionKeyStr);
            const {
                iv,      // [unused][???] // probably it is needed for decryption (not implemented)
                metaMac, // [unused][???]
                key
            } = mega.decryptionKeyToParts(decryptionKey);
            this.key = key;
        } else {
            this.key = null;
        }

        const {
            size,
            nodeAttributesEncoded,
            downloadUrl,
            timeLeft,
        } = nodeInfo;

        this.size = size;
        this.#meta = {downloadUrl, timeLeft};

        if (share.decryptionKeyStr) {
            const {
                name,
                serializedFingerprint
            } = mega.parseEncodedNodeAttributes(nodeAttributesEncoded, this.key);

            const {
                modificationDate,
                fileChecksum   // [unused][???]
            } = mega.parseFingerprint(serializedFingerprint);

            this.name = name;
            this.modificationDate = modificationDate;
        } else {
            this.name = this.modificationDate = null;
        }

    }


    type;
    id;
    size;

    key;
    name;
    modificationDate;
    get mtime() { // An alias
        return this.modificationDate;
    }
    get modificationDateFormatted() {
        return util.secondsToFormattedString(this.modificationDate);
    }

    #meta;
    get timeLeft() {
        return this.#meta.timeLeft;
    }
    get downloadUrl() {
        return this.#meta.downloadUrl;
    }
}

class SharedMediaFileNode extends SharedFileNode {
    constructor(share, nodeInfo) {
        super(share, nodeInfo);
        this.type = "sharedMediaFile";
        this.fileAttributesStr = nodeInfo.fileAttributesStr;
    }
    fileAttributesStr;

    //todo mixin for it
    /** @returns {Promise<Uint8Array>} */
    getThumbnail() {
        return FileAttributes.getThumbnail(this);
    };
    /** @returns {Promise<Uint8Array>} */
    getPreview() {
        return FileAttributes.getPreview(this);
    };
}



/**
 * Static factory methods for node creating
 *
 * Well, not the best JSDoc signatures, may be rework it later
 */
class Nodes {

    /**
     * @param {string} url
     * @returns {Promise<SharedFileNode|SharedMediaFileNode|RootFolderNode|FolderNode|FileNode|MediaFileNode>
     *     |Promise<(SharedFileNode|SharedMediaFileNode)[]|(RootFolderNode,FolderNode,FileNode,MediaFileNode)[]>}
     */
    static async of(url) {
        return Share.isFolder(url) ? Nodes.getFolderNodes(url) : Nodes.getSharedNode(url);
    }

    /**
     * @param {string} url
     * @returns {Promise<SharedFileNode|SharedMediaFileNode|RootFolderNode|FolderNode|FileNode|MediaFileNode>}
     */
    static async node(url) {
        if (!Share.isFolder(url)) {
            return Nodes.getSharedNode(url);
        } else {
            const nodes = await Nodes.getFolderNodes(url);
            if (nodes.selectedId) {
                return nodes.selectedId;
            } else {
                return nodes.root;
            }
        }
    }

    /**
     * @param {string} url
     * @returns {Promise<(SharedFileNode|SharedMediaFileNode)[]|(RootFolderNode,FolderNode,FileNode,MediaFileNode)[]>}
     */
    static async nodes(url) {
        if (Share.isFolder(url)) {
            return Nodes.getFolderNodes(url);
        } else {
            return [await Nodes.getSharedNode(url)];
        }
    }

    /**
     * @param {string} url
     * @returns {Promise<SharedFileNode|SharedMediaFileNode>}
     */
    static async getSharedNode(url) {
        const share = Share.fromUrl(url);
        const nodeInfo = await mega.requestNodeInfo(share.id);
        if (nodeInfo.fileAttributesStr) {
            return new SharedMediaFileNode(share, nodeInfo);
        } else {
            return new SharedFileNode(share, nodeInfo);
        }
    }

    /**
     * @param {string} url
     * @returns {Promise<(RootFolderNode,FolderNode,FileNode,MediaFileNode)[]>} [note] The array have mixed type content
     */
    static async getFolderNodes(url) {

        const share = Share.fromUrl(url);

        const masterKey = share.decryptionKeyStr ? mega.megaBase64ToArrayBuffer(share.decryptionKeyStr) : null;
        //logger.debug("[masterKey]", masterKey);

        const {
            nodes,
            rootId
        } = await mega.requestFolderInfo(share.id);
        //logger.debug(`[requestFolderInfo("${share.id}").nodes]`, nodes);

        const folders = new Map(); // [note] JS's HashMap holds the insert order
        const files = [];


        // `masterKey` is null when the share has no specified key,
        // `node.decryptionKeyStr` is null when `k` of node info (from API) is an empty string (Mega's bug)
        //todo either handle it here (new classes for nodes without a key)
        // or in the node constructor modify its type to indicate this thing
        for (let i = 0; i < nodes.length; i++) {

            const node = nodes[i];
            let resultNode;

            node.parent = folders.get(node.parentId); // `undefine` for root

            if (node.type === "file") {
                if (node.fileAttributesStr) {
                    resultNode = new MediaFileNode(node, masterKey);
                } else {
                    resultNode = new FileNode(node, masterKey);
                }
                files.push(resultNode);

                // the parent node is always located before the child node, no need to check its existence [1][note]
                folders.get(resultNode.parentId).files.push(resultNode);

            } else if (node.type === "folder") {
                if (node.id === rootId) { // or `if (i === 0)`
                    resultNode = new RootFolderNode(node, masterKey);
                } else {
                    resultNode = new FolderNode(node, masterKey);
                    folders.get(resultNode.parentId).folders.push(resultNode); // see [1] note
                }
                folders.set(node.id, resultNode);
            }

            nodes[i] = null;
        }

        // todo: rework – make an iterable class with these getters
        const resultArray = [...folders.values(), ...files];
        const root = folders.get(rootId);
        const selected = resultArray.find(node => node.id === share.selectedId);
        Object.defineProperty(resultArray, "root",     { get: () => root });
        Object.defineProperty(resultArray, "selected", { get: () => selected });
        Object.defineProperty(resultArray, "folders",  { get: () => [...folders.values()] });
        Object.defineProperty(resultArray, "files",    { get: () => files });

        return resultArray;
    }

    static isMediaNode(node) {
        return node.type === "sharedMediaFile" || node.type === "mediaFile";
    }
}


module.exports = {
    FolderNode, RootFolderNode,
    FileNode, MediaFileNode,
    SharedFileNode, SharedMediaFileNode,
    Share,
    Nodes
};