const URLS = require("./test-urls-private");
const {util} = require("../util");
const {mega} = require("../mega");
const {Nodes} = require("../nodes");
const Share = require("../share");
const FileAttributes = require("../file-attributes");



async function example() {
    const nodes = await Nodes.nodes(URLS.FOLDER_WITH_DUBS_1_FORK);

    /** @type Map<String, Uint8Array> */ // <node.id, bytes>
    const map = await FileAttributes.getThumbnails(nodes.filter(Nodes.isMediaNode));

    let index = 1;
    for (const [id, bytes] of map.entries()) {
        const node = nodes.find(node => node.id === id);
        util.saveFile(bytes, `thumb-${index.toString().padStart(3, "0")}-${id}.jpg`, node.mtime);
        index++;
    }

    console.log();
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();