const URLS = require("./private-test-urls");
const FileAttributes = require("./file-attributes");
const {util} = require("./util");
const logger = util.logger;
const {mega} = require("./mega");
const {Nodes} = require("./nodes");
const {Semaphore, CountDownLatch} = require("./semaphore");


!async function test() {
    console.time("test");

    const folderNodes = await Nodes.nodes(URLS.FOLDER_136_FILES);
    await saveNodesThumbnail_1(folderNodes);

    console.log("        ---the end---        ");
    console.timeEnd("test");
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

async function saveNodesThumbnail_1(folderNodes) {

    const isMediaNode = node => node.type === "sharedMediaFile" || node.type === "mediaFile";
    const mediaNodesCount = folderNodes.filter(isMediaNode).length;
    let countDownLatch = new CountDownLatch(mediaNodesCount);
    console.log(mediaNodesCount);

    let i = 0;
    for (const node of folderNodes) {
        //if (node.type === "sharedMediaFile" || node.type === "mediaFile") {
        if (util.filter(node, isMediaNode)) {
            const index = ++i; // a block closure
            console.log(`${index} ${node.name}`);
            node.getThumbnail()
                .then(thumb => {
                    // NB: async – the creation time order will be not the same as the order of pictures // todo add mutex?
                    util.saveFile(thumb, `thumb-${index.toString().padStart(3, "0")}-${node.id}.jpg`, node.mtime);
                    countDownLatch.countDown();
                });
        }
    }
    return countDownLatch.wait();
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

// Not ideal, but works (old version, now there is a semaphore)
//todo remove or rework
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
                    await util.sleep(4000); // will be errors if it is less
                    console.log("---reset---");
                    count = 0;
                }
                console.log(++count);
                node.getThumbnail()
                    .then(thumb => {
                        util.saveFile(thumb, `thumb-${node.id}.jpg`, node.mtime);
                    })
                    .catch(error => {
                        errors++;
                        console.error(errors + " " + folder.name + "/" + node.name + " -------ERROR-------");

                        // FetchError: request to https://g.api.mega.co.nz/cs failed, reason: write EPROTO 1264...
                        //console.error(error);
                    });
            }
        }
        console.log(folder.name + " :folders: -----------------------------------------------------");
        for (const node of folder.folders) {
            await walkThroughFolder(node);
        }
    }
}