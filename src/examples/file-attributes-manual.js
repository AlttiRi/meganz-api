const URLS = require("./test-urls-private");
const FileAttributes = require("../file-attributes");
const {Nodes} = require("../nodes");
const {util} = require("../util");

const urls = [];
async function example() {
    const promises = [];

    const folderNodes = await Nodes.nodes(URLS.FOLDER_136_FILES);
    for (const node of folderNodes) {
        if (Nodes.isMediaNode(node)) {
            promises.push(handle(node));
        }
    }
    await Promise.all(promises);

    // A hack to print the whole array in Node.js console
    console.log(urls.sort().slice(0, 100));
    console.log(urls.sort().slice(100));
}

async function handle(node) {
    const downloadUrl = await FileAttributes.Thumbnail.getDownloadUrl({node});
    urls.push(downloadUrl);

    // const encryptedBytes = await FileAttributes.Thumbnail.getEncryptedBytes({node, downloadUrl});
    // const bytes = await FileAttributes.Thumbnail.getBytes({node, encryptedBytes});
    // or
    const bytes = await FileAttributes.Thumbnail.getBytes({node, downloadUrl});

    util.saveFile(bytes, `thumb-${node.id}.jpg`, node.mtime);
}

!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();