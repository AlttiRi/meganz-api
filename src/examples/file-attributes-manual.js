const URLS = require("./test-urls-private");
const FileAttributes = require("../file-attributes");
const {Nodes} = require("../nodes");
const {Util} = require("../util");
const {performance} = require("../browser-context");
const {progress} = require("./promise-progress");


async function example() {
    const promises = [];

    const nodes = await progress(Nodes.nodes(URLS.FOLDER_999), "Nodes info fetching");
    let i = 0;
    for (const node of nodes) {
        if (Nodes.isMediaNode(node) && i < 151) {
            //await progress(Util.sleep(10), "Waiting for a delay in cycle");
            promises.push(handle(node, i++));
        }
    }
    await Promise.all(promises);
}

async function handle(node, index) {
    const downloadUrl = await progress(FileAttributes.Thumbnail.getDownloadUrl({node}), "URL fetching");
    //await progress(Util.sleep(1), "Waiting for a delay");

    const encryptedBytes = await FileAttributes.Thumbnail.getEncryptedBytes({node, downloadUrl},true);
    let bytes /*//*/ = await FileAttributes.Thumbnail.getBytes({node, encryptedBytes}); // comment the right part to no decryption
    // or
    //const bytes = await FileAttributes.Thumbnail.getBytes({node, downloadUrl});
    const id = node.thumbnail.bunch.id;
    const now = Math.trunc(performance.now()) + 1600000000; // the fake date - 2020.09.13// use for sorting in the explorer

    await Util.saveFile(bytes || encryptedBytes, `thumb-${index.toString().padStart(3, "0")}-${id}.jpg`, now);
}

!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();