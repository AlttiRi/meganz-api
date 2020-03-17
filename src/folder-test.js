const URLS = require("./test-urls");
const FileAttributes = require("./file-attributes");
const {util} = require("./util");
const logger = util.logger;
const {mega} = require("./mega");
const {Nodes} = require("./nodes");


!async function test() {

    const nodesFromFolder = await Nodes.nodes(URLS.CAT_FOLDER);
    const nodesFromFile   = await Nodes.nodes(URLS.CAT_IMAGE_FILE);
    console.log(nodesFromFolder.root);
    console.log("[1] ---");
    console.log(nodesFromFolder);
    console.log("[2] ---");
    console.log(nodesFromFile);

    const nodeFromFile = await Nodes.node(URLS.CAT_IMAGE_FILE);
    console.log("[3] ---");
    console.log(nodeFromFile);

    // todo need the semaphore (in case of a lot of files in a folder)
    // for (const node of nodesFromFolder) {
    //     if (node.type === "sharedMediaFile" || node.type === "mediaFile") {
    //         node.getThumbnail()
    //             .then(thumb => util.saveFile(thumb, `thumb-${node.id}.jpg`, node.mtime));
    //     }
    // }

    //too slow, needs the parallel downloading
    for (const node of nodesFromFolder) {
        if (node.type === "sharedMediaFile" || node.type === "mediaFile") {
            const thumb = await node.getThumbnail();
            util.saveFile(thumb, `thumb-${node.id}.jpg`, node.mtime);
        }
    }


    //const thumb = await FileAttributes.getThumbnail(nodeFromFile);
    // or
    const thumb = await nodeFromFile.getThumbnail();
    util.saveFile(thumb, `thumb-${nodeFromFile.id}.jpg`, nodeFromFile.mtime);

    const preview = await FileAttributes.getPreview(nodeFromFile);
    util.saveFile(preview, `preview-${nodeFromFile.id}.jpg`, nodeFromFile.mtime);

    const nodeFromFolder = await Nodes.node(URLS.CAT_FOLDER_SELECTED_FILE);
    console.log("[4] ---");
    console.log(nodeFromFolder);

}();