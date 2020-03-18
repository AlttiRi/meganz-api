const URLS = require("./test-urls");
const FileAttributes = require("./file-attributes");
const {util} = require("./util");
const logger = util.logger;
const {mega} = require("./mega");
const {Nodes} = require("./nodes");


!async function test() {

    // await example_1();
    // await example_2();

    const folderNodes = await Nodes.nodes(URLS.CAT_FOLDER);
    await saveNodesThumbnail_3(folderNodes);

}();

async function example_1() {
    const nodesFromFolder = await Nodes.nodes(URLS.CAT_FOLDER);
    const nodesFromFile   = await Nodes.nodes(URLS.CAT_IMAGE_FILE);
    console.log(nodesFromFolder.root);
    console.log("[1] ---");
    console.log(nodesFromFolder);
    console.log("[2] ---");
    console.log(nodesFromFile);
}

async function example_2() {
    const nodeFromFile = await Nodes.node(URLS.CAT_IMAGE_FILE);
    console.log("[3] ---");
    console.log(nodeFromFile);

    //const thumb = await FileAttributes.getThumbnail(nodeFromFile);
    // or
    const thumb = await nodeFromFile.getThumbnail();
    util.saveFile(thumb, `thumb-${nodeFromFile.id}.jpg`, nodeFromFile.mtime);

    const preview = await FileAttributes.getPreview(nodeFromFile);
    util.saveFile(preview, `preview-${nodeFromFile.id}.jpg`, nodeFromFile.mtime);

    const nodeFromFolder = await Nodes.node(URLS.CAT_FOLDER_SELECTED_FILE);
    console.log("[4] ---");
    console.log(nodeFromFolder);
}

// Need the semaphore (in case of a lot of files in a folder)
// There are errors if thumbnails are over 63
async function saveNodesThumbnail_1(folderNodes) {
    for (const node of folderNodes) {
        if (node.type === "sharedMediaFile" || node.type === "mediaFile") {
            node.getThumbnail()
                .then(thumb => util.saveFile(thumb, `thumb-${node.id}.jpg`, node.mtime));
        }
    }
}

// Too slow, needs the parallel downloading
async function saveNodesThumbnail_2(folderNodes) {
    for (const node of folderNodes) {
        if (node.type === "sharedMediaFile" || node.type === "mediaFile") {
            const thumb = await node.getThumbnail();
            util.saveFile(thumb, `thumb-${node.id}.jpg`, node.mtime);
        }
    }
}

// Not ideal, but works
async function saveNodesThumbnail_3(folderNodes) {
    let errors = 0;
    let count = 0 ;
    await walkThroughFolder(folderNodes.root);

    async function walkThroughFolder(folder) {
        console.log(folder.name + " :files: -----------------------------------------------------");

        for (const node of folder.files) {
            console.log(folder.name + "/" + node.name);
            if (node.type === "sharedMediaFile" || node.type === "mediaFile") {
                // max safe connection count is 63
                if (count === 63) {
                    console.log("---await---");
                    await util.sleep(4000);
                    console.log("---reset---");
                    count = 0;
                }
                console.log(++count);
                node.getThumbnail()
                    .then(thumb => {
                        util.saveFile(thumb, `thumb-${node.id}.jpg`, node.mtime);
                    })
                    .catch(_ => {
                        errors++;
                        console.error(errors + " " + folder.name + "/" + node.name + " -------ERROR-------")
                    });
            }
        }
        console.log(folder.name + " :folders: -----------------------------------------------------");
        for (const node of folder.folders) {
            await walkThroughFolder(node);
        }
    }
}