const URLS = require("./test-urls-private");
const FileAttributes = require("../file-attributes");
const {progress} = require("./promise-progress");
const {Nodes} = require("../nodes");
const {util} = require("../util");


async function example() {
    await progress(util.sleep(1110), "Waiting");
    const nodes = await progress(Nodes.nodes(URLS.FOLDER_999));
    await progress(util.sleep(6660), "Waiting");
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();