const { mega } = require("./mega");


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
    modificationDate; // [requires nodeKey]
}

class MediaFileNode extends FileNode {
    constructor(node, masterKey) {
        super(node, masterKey);
        this.type = "mediaFile";
        this.fileAttributes = node.fileAttributes;
    }
    fileAttributes; // [requires nodeKey to work later]
    //todo fileAttributes getters
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


// todo
class SharedFileNode {
    type = "sharedFile";

    id;
    nodeKey;
    name;

    size;
    modificationDate;
    fileAttributes;
}

module.exports = {FolderNode, FileNode, MediaFileNode, SharedFileNode};