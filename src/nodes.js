const { mega } = require("./mega");


class BasicFolderShareNode {
    constructor(node) {
        this.id           = node.id;
        this.parent       = node.parent;
        this.owner        = node.owner;
        this.creationDate = node.creationDate;
    }
    type;
    id;
    parent;
    owner;
    creationDate;

    nodeKey;
    name; // [requires nodeKey]
}

class FileNode extends BasicFolderShareNode {
    constructor(node) {
        super(node);
        this.type = "file";
        this.size = node.size;
    }
    size;
    modificationDate; // [requires nodeKey]
}

class MediaFileNode extends BasicFolderShareNode {
    constructor(node) {
        super(node);
        this.type = "mediaFile";
        this.fileAttributes = node.fileAttributes;
    }
    fileAttributes; // [requires nodeKey to work later]
}

class FolderNode extends BasicFolderShareNode {
    constructor(node) {
        super(node);
        this.type = "folder";
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