const URLS = require("./test-urls-private");
const FileAttributes = require("../file-attributes");
const {Nodes} = require("../nodes");
const {util} = require("../util");
const {progress} = require("./promise-progress");


const urls = [];
async function example() {
    const promises = [];

    const nodes = await progress(Nodes.nodes(URLS.FOLDER_999));
    let i = 0;
    for (const node of nodes) {
        if (Nodes.isMediaNode(node) && i < 151) {
            promises.push(handle(node, i++));
        }
    }
    await Promise.all(promises);

    // A hack to print the whole array in Node.js console
    //console.log(urls.sort().slice(0, 100));
    //console.log(urls.sort().slice(100));
}

async function handle(node, index) {
    const downloadUrl = await progress(FileAttributes.Thumbnail.getDownloadUrl({node}), "URL fetching");
    urls.push(downloadUrl);
    await progress(util.sleep(5200), "Waiting"); // to run bytes downloading at one moment

    const encryptedBytes = await FileAttributes.Thumbnail.getEncryptedBytes({node, downloadUrl},0);
    let bytes /*//*/ = await FileAttributes.Thumbnail.getBytes({node, encryptedBytes}); // comment the right part to no decryption
    // or
    //const bytes = await FileAttributes.Thumbnail.getBytes({node, downloadUrl});

    util.saveFile(bytes || encryptedBytes, `thumb-${index.toString().padStart(3, "0")}-${node.id}.jpg`, node.mtime);
}

!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();