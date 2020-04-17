const URLS = require("./test-urls-private");
const {util} = require("../util");
const {mega} = require("../mega");
const {Nodes} = require("../nodes");
const Share = require("../share");
const FileAttributes = require("../file-attributes");



async function example() {
    const nodes = await Nodes.nodes(URLS.FOLDER_WITH_DUBS_1_FORK);

    /** @type [{node: Object, bytes: Uint8Array}] */
    const results = await FileAttributes.getThumbnails(nodes.filter(Nodes.isMediaNode));

    let index = 1;
    for (const {node, bytes} of results) {
        util.saveFile(bytes, `thumb-${index.toString().padStart(3, "0")}-${node.id}.jpg`, node.mtime);
        index++;
    }

    console.log();
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();