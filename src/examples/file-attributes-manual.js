const URLS = require("./test-urls-private");
const FileAttributes = require("../file-attributes");
const {Nodes} = require("../nodes");
const {util} = require("../util");

const timer = new Promise(resolve => setTimeout(resolve, 1200));
const urls = [];
async function example() {
    const promises = [];

    const folderNodes = await Nodes.nodes(URLS.FOLDER_136_FILES);
    let i = 1;
    for (const node of folderNodes) {
        if (Nodes.isMediaNode(node)) {
            promises.push(handle(node, i++));
        }
    }
    await Promise.all(promises);

    // A hack to print the whole array in Node.js console
    //console.log(urls.sort().slice(0, 100));
    //console.log(urls.sort().slice(100));
}

async function handle(node, index) {
    const downloadUrl = await FileAttributes.Thumbnail.getDownloadUrl({node});
    urls.push(downloadUrl);
    //await timer; // to run bytes downloading at one moment

    const encryptedBytes = await FileAttributes.Thumbnail.getEncryptedBytes({node, downloadUrl},true);
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