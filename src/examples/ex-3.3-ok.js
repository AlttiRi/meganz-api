const URLS = require("./test-urls-private");
const {Util} = require("../util");
const {Nodes} = require("../nodes");
const {CountDownLatch} = require("../synchronization");
const {progress} = require("./promise-progress");

async function example() {
    const folderNodes = await progress(Nodes.nodes(URLS.FOLDER_136_FILES), "Nodes.nodes");

    const mediaNodesCount = folderNodes.filter(Nodes.isMediaNode).length;
    const countDownLatch = new CountDownLatch(mediaNodesCount);

    let i = 0;
    for (const node of folderNodes) {
        if (Nodes.isMediaNode(node)) {
            const index = ++i; // a block closure
            console.log(`${index} ${node.name}`);
            node.getThumbnail()
                .then(thumb => {
                    // NB: async – the creation time order will be not the same as the order of pictures
                    Util.saveFile(thumb, `thumb-${index.toString().padStart(3, "0")}-${node.id}.jpg`, node.mtime);
                    countDownLatch.countDown();
                });
        }
    }
    return countDownLatch.wait();
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();