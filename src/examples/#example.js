const URLS = require("./test-urls-private");
const {util} = require("../util");
const {mega} = require("../mega");
const {Nodes} = require("../nodes");
const Share = require("../share");
const FileAttributes = require("../file-attributes");



async function example() {
    const nodes = await Nodes.nodes(URLS.FOLDER_136_FILES);
    console.log(nodes);
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();