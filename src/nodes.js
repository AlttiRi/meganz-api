const { mega } = require("./mega");
const { util } = require("./util");
const FileAttributes = require("./file-attributes");

class Share {
    id;
    decryptionKeyStr;
    isFolder;
    selectedFolderId;
    selectedFileId;

    constructor(url) {
        //logger.info("Parsing URL...");
        Object.assign(this, mega.parseUrl(url));
        //logger.debug(this.toString());
    }

    toString() {
        return  "" +
            "[id]               " + this.id               + "\n" +
            "[decryptionKeyStr] " + this.decryptionKeyStr + "\n" +
            "[isFolder]         " + this.isFolder         + "\n" +
            "[selectedFolderId] " + this.selectedFolderId + "\n" +
            "[selectedFileId]   " + this.selectedFileId;
    }

    static isFolder(url) {
        return mega.parseUrl(url).isFolder;
    }

    get selectedId() {
        return this.selectedFileId ? this.selectedFileId : this.selectedFolderId ? this.selectedFolderId : null;
    }
}

//todo the most basic class with [Symbol.toStringTag]: "MegaNode"

class BasicFolderShareNode {
    constructor(node, masterKey) {
        this.id           = node.id;
        this.parentId     = node.parentId;
        this.parent       = node.parent ? node.parent : null;
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

    get nodeKey() {
        return this.#decryptionKey;
    };
    name; // [requires nodeKey]

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
            } = mega.parseEncodedNodeAttributes(node.attributes, this.nodeKey);
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
    get nodeKey() {
        if (!this.#keyParts) {
            if (super.nodeKey) {
                this.#keyParts = mega.decryptionKeyToParts(super.nodeKey);
            } else {
                this.#keyParts = {iv: null, metaMac: null, nodeKey: null};
            }
        }
        return this.#keyParts.nodeKey;
    };
    modificationDate;   // [requires nodeKey]
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
        this.fileAttributes = node.fileAttributes;
    }
    fileAttributes; // [requires nodeKey to work later]

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
            } = mega.parseEncodedNodeAttributes(node.attributes, this.nodeKey);
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
                nodeKey
            } = mega.decryptionKeyToParts(decryptionKey);
            this.nodeKey = nodeKey;
        } else {
            this.nodeKey = null;
        }

        const {
            size,
            nodeAttributesEncoded,
            fileAttributes, // [unused][uses in sub classes]
            downloadUrl,
            timeLeft,
            EFQ,            // [unused]
            MSD             // [unused]
        } = nodeInfo;

        this.size = size;
        this.#meta = {downloadUrl, timeLeft};

        if (share.decryptionKeyStr) {
            const {
                name,
                serializedFingerprint
            } = mega.parseEncodedNodeAttributes(nodeAttributesEncoded, this.nodeKey);

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

    nodeKey;
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
        this.fileAttributes = nodeInfo.fileAttributes;
    }
    fileAttributes;

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
        const share = new Share(url);
        const nodeInfo = await mega.requestNodeInfo(share.id);
        if (nodeInfo.fileAttributes) {
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

        const share = new Share(url);

        const masterKey = share.decryptionKeyStr ? mega.megaBase64ToArrayBuffer(share.decryptionKeyStr) : null;
        //logger.debug("[masterKey]", masterKey);

        const {
            nodes,
            rootId
        } = await mega.requestFolderInfo(share.id);
        //logger.debug(`[requestFolderInfo("${share.id}").nodes]`, nodes);

        const folders = new Map(); // [note] JS's HashMap holds the insert order
        const files = [];


        for (let i = 0; i < nodes.length; i++) {

            const node = nodes[i];
            let resultNode;

            node.parent = folders.get(node.parentId); // `undefine` for root

            if (node.type === "file") {
                if (node.fileAttributes) {
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