const {util} = require("./util");
const logger = util.logger;
const {mega} = require("./mega");
const {FolderNode, RootFolderNode, FileNode, MediaFileNode} = require("./nodes");


!async function test() {
    let url = "https://mega.nz/#F!e1ogxQ7T!ee4Q_ocD1bSLmNeg9B6kBw"; // a cat folder
    //url = "https://mega.nz/#F!e1ogxQ7T"; // a cat folder - no key

    console.log(await getFolderNodes(url));




    async function getFolderNodes(url) {

        class Share {
            id;
            decryptionKey;  // todo rename to decryptionKeyStr
            isFolder;
            selectedFolder;
            selectedFile;

            constructor(url) {
                //logger.info("Parsing URL...");
                Object.assign(this, mega.parseUrl(url));
                //logger.debug(this.toString());
            }

            toString() {
                return  "" +
                    "[id]             " + this.id             + "\n" +
                    "[decryptionKey]  " + this.decryptionKey  + "\n" +
                    "[isFolder]       " + this.isFolder       + "\n" +
                    "[selectedFolder] " + this.selectedFolder + "\n" +
                    "[selectedFile]   " + this.selectedFile;
            }

            get selected() {
                // todo
            }
        }
        const share = new Share(url);

        const masterKey = share.decryptionKey ? mega.megaBase64ToArrayBuffer(share.decryptionKey) : null;
        //logger.debug("[masterKey]", masterKey);

        const {
            nodes,
            rootId
        } = await requestFolderInfo(share.id);
        //logger.debug(`[requestFolderInfo("${share.id}").nodes]`, nodes);

        const folders = new Map(); // [note] JS's HashMap holds the insert order
        const files = [];


        for (let i = 0; i < nodes.length; i++) {

            const node = nodes[i];
            let resultNode;

            if (node.type === "file") {
                if (node.fileAttributes) {
                    resultNode = new MediaFileNode(node, masterKey);
                } else {
                    resultNode = new FileNode(node, masterKey);
                }
                files.push(resultNode);

                // the parent node is always located before the child node, no need to check its existence [1][note]
                folders.get(resultNode.parent).files.push(resultNode);

            } else if (node.type === "folder") {
                if (node.id === rootId) { // or `if (i === 0)`
                    resultNode = new RootFolderNode(node, masterKey);
                } else {
                    resultNode = new FolderNode(node, masterKey);
                    folders.get(resultNode.parent).folders.push(resultNode); // see [1] note
                }
                folders.set(node.id, resultNode);
            }

            nodes[i] = null;
        }

        return [...folders.values(), ...files];
    }


    // The logic of nodes order that Mega returns looks like it is:
    // The first node is root node,
    // the next: root node children sorted by creationDate (folders have the same priority as files),
    // the next: nodes (also sorted by creationDate) of each folder,
    //              these folder iterates from last one to the first (like a stack works). And etc.
    //
    // So, a folder node is always located before the nodes that are inside it,       <-- [important]
    // all nodes with the same parent are listed one by one in creationDate order,
    // one level folders iterates in reverse order to `print` their children.
    async function requestFolderInfo(shareId) {
        const responseData = await mega.requestAPI({
            "a": "f",
            "r":  1, // Recursive (include sub folders/files) // if not set only root node and 1th lvl file/folder nodes
            "c":  1, // [???][useless]
            "ca": 1, // [???][useless]
        }, {
            "n": shareId
        });
        //logger.debug("[responseData]", responseData);

        const {
            f: rawNodes, // array of file and folder nodes
            sn, // [???][unused] // "1"
            noc // [???][unused] // "McPlUF51ioE" [random]
        } = responseData;


        // Every node has a prefix in its `k` value – `shareRootNodeId:decryptionKey`
        const shareRootNodeId = rawNodes[0].k.match(/^[^:]+/)[0];
        //logger.debug("[sharedRootId]", shareRootNodeId);


        function prettifyType(type) {
            switch (type) {
                case  0: return "file";
                case  1: return "folder";
                default: return type;
            }
        }

        function prettifyNodes(rawNodes) {
            return rawNodes.map(node => {
                const prettyNode = {
                    id: node.h,
                    parent: node.p,
                    owner: node.u,
                    type: prettifyType(node.t),
                    attributes: node.a,
                    decryptionKeyStr: node.k.match(/(?<=:)[\w-_]+/)[0],
                    creationDate: node.ts,
                };
                if (prettyNode.type === "file") {
                    prettyNode.size = node.s;
                    if (node.fa) { // only for images and videos
                        prettyNode.fileAttributes = node.fa;
                    }
                }
                return prettyNode;
            });
        }

        return {nodes: prettifyNodes(rawNodes), rootId: shareRootNodeId};
    }

}();