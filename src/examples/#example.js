const URLS = require("./test-urls-private");
const {util} = require("../util");
const {Nodes} = require("../nodes");
const {CountDownLatch} = require("../synchronization");


async function example() {
    const nodesFromFolder = await Nodes.nodes(URLS.SELECTED_FOLDER_WITH_UNDECRYPTED_FILE);
    //console.log(nodesFromFolder);
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();