const { mega } = require("./mega");
const { util } = require("./util");


class BasicFolderShareNode {
    constructor(node, masterKey) {
        this.id           = node.id;
        this.parent       = node.parent;
        this.owner        = node.owner;
        this.creationDate = node.creationDate;

        if (masterKey) {
            const decryptionKeyEncrypted = mega.megaBase64ToArrayBuffer(node.decryptionKeyStr);
            this.#decryptionKey = mega.decryptKey(decryptionKeyEncrypted, masterKey);
        } else {
            this.#decryptionKey = null;
        }
    }
    type;
    id;
    parent;
    owner;
    creationDate;
    #decryptionKey;

    get nodeKey() {
        return this.#decryptionKey;
    };
    name; // [requires nodeKey]
}

class FileNode extends BasicFolderShareNode {
    constructor(node, masterKey) {
        super(node, masterKey);
        this.type = "file";
        this.size = node.size;

        if (masterKey) {
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

class MediaFileNode extends FileNode {
    constructor(node, masterKey) {
        super(node, masterKey);
        this.type = "mediaFile";
        this.fileAttributes = node.fileAttributes;
    }
    fileAttributes; // [requires nodeKey to work later]
    //todo fileAttributes getters for 8, 9 (9 may not exists)

    // /** @returns {Promise<Uint8Array>} */
    // getPreview() {
    //     return mega.requestFileAttributeData(this, 1);
    // };
    // /** @returns {Promise<Uint8Array>} */
    // getThumbnail() {
    //     return mega.requestFileAttributeData(this, 0);
    // };
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
        return this.#size; // todo
    };
}

class RootFolderNode extends FolderNode {
    constructor(node, masterKey) {
        super(node, masterKey);
        this.type = "rootFolder";
    }
}

//todo static factory methods
// SharedNode.of()
// FolderShareNode.of()

class SharedFileNode {
    constructor(share, nodeInfo) {
        this.type = "sharedFile";
        this.id = share.id; // in fact it is not real file node id (for every new generated share url you get new id)

        if (share.decryptionKey) {
            const decryptionKey = mega.megaBase64ToArrayBuffer(share.decryptionKey);
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
            fileAttributes, // [uses in sub class]
            downloadUrl,
            timeLeft,
            EFQ,            // [unused]
            MSD             // [unused]
        } = nodeInfo;

        this.size = size;
        this.#meta = {downloadUrl, timeLeft};

        if (share.decryptionKey) {
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
}

module.exports = {FolderNode, RootFolderNode, FileNode, MediaFileNode, SharedFileNode, SharedMediaFileNode};