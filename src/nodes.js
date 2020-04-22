const {Util} = require("./util");
const {MegaUtil} = require("./mega-util");
const {Mega} = require("./mega");
const FileAttributes = require("./file-attributes");
const Share = require("./share");


//todo the most basic class with [Symbol.toStringTag]: "MegaNode"

class BasicFolderShareNode {
    constructor(node, masterKey) {
        this.id           = node.id;
        this.parentId     = node.parentId;
        this.parent       = node.parent || null;
        this.ownerId      = node.ownerId;
        this.creationDate = node.creationDate;

        if (masterKey && node.decryptionKeyStr) {
            const decryptionKeyEncrypted = MegaUtil.megaBase64ToArrayBuffer(node.decryptionKeyStr);
            this.#decryptionKey = MegaUtil.decryptKey(decryptionKeyEncrypted, masterKey);
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
            } = MegaUtil.parseEncodedNodeAttributes(node.attributes, this.key);
            this.name = name;

            const {
                modificationDate,
                fileChecksum      // [unused][???]
            } = MegaUtil.parseFingerprint(serializedFingerprint);
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
                this.#keyParts = MegaUtil.decryptionKeyToParts(super.key);
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
        return Util.secondsToFormattedString(this.modificationDate);
    }

    get downloadUrl() { // not implemented
        return null;
    }
}

/**
 * @implements IMediaNodeSimple
 * @mixes IMediaGettersMixin
 */
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

    get thumbnail() { // todo others
        return FileAttributes.of(this).byType(FileAttributes.Thumbnail.type);
    }

    get preview() {
        return FileAttributes.of(this).byType(FileAttributes.Preview.type);
    }
}

class FolderNode extends BasicFolderShareNode {
    constructor(node, masterKey) {
        super(node, masterKey);
        this.type = "folder";

        if (masterKey) {
            const {
                name
            } = MegaUtil.parseEncodedNodeAttributes(node.attributes, this.key);
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
            const decryptionKey = MegaUtil.megaBase64ToArrayBuffer(share.decryptionKeyStr);
            const {
                iv,      // [unused][???] // probably it is needed for decryption (not implemented)
                metaMac, // [unused][???]
                key
            } = MegaUtil.decryptionKeyToParts(decryptionKey);
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
            } = MegaUtil.parseEncodedNodeAttributes(nodeAttributesEncoded, this.key);

            const {
                modificationDate,
                fileChecksum   // [unused][???]
            } = MegaUtil.parseFingerprint(serializedFingerprint);

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
        return Util.secondsToFormattedString(this.modificationDate);
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
     * @param {string|URL} url
     * @returns {Promise<SharedFileNode|SharedMediaFileNode|RootFolderNode|FolderNode|FileNode|MediaFileNode>
     *     |Promise<(SharedFileNode|SharedMediaFileNode)[]|(RootFolderNode,FolderNode,FileNode,MediaFileNode)[]>}
     */
    static async of(url) {
        const share = Share.fromUrl(url);
        return share.isFolder ? Nodes.getFolderNodes(share) : Nodes.getSharedNode(share);
    }

    /**
     * @param {string|URL} url
     * @returns {Promise<SharedFileNode|SharedMediaFileNode|RootFolderNode|FolderNode|FileNode|MediaFileNode>}
     */
    static async node(url) {
        const share = Share.fromUrl(url);
        if (share.isFolder) {
            return Nodes.getSharedNode(share);
        } else {
            const nodes = await Nodes.getFolderNodes(share);
            if (nodes.selectedId) {
                return nodes.selectedId;
            } else {
                return nodes.root;
            }
        }
    }

    /**
     * @param {string|URL} url
     * @returns {Promise<(SharedFileNode|SharedMediaFileNode)[]|(RootFolderNode,FolderNode,FileNode,MediaFileNode)[]>}
     */
    static async nodes(url) {
        const share = Share.fromUrl(url);
        if (share.isFolder) {
            return Nodes.getFolderNodes(share);
        } else {
            return [await Nodes.getSharedNode(share)];
        }
    }

    /**
     * @param {Share} share
     * @returns {Promise<SharedFileNode|SharedMediaFileNode>}
     */
    static async getSharedNode(share) {
        const nodeInfo = await Mega.requestNodeInfo(share.id);
        if (nodeInfo.fileAttributesStr) {
            return new SharedMediaFileNode(share, nodeInfo);
        } else {
            return new SharedFileNode(share, nodeInfo);
        }
    }

    /**
     * @param {Share} share
     * @returns {Promise<(RootFolderNode,FolderNode,FileNode,MediaFileNode)[]>} [note] The array have mixed type content
     */
    static async getFolderNodes(share) {

        const masterKey = share.decryptionKeyStr ? MegaUtil.megaBase64ToArrayBuffer(share.decryptionKeyStr) : null;
        //logger.debug("[masterKey]", masterKey);

        const {
            nodes,
            rootId
        } = await Mega.requestFolderInfo(share.id);
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
        //todo .mediaNodes

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
    Nodes
};