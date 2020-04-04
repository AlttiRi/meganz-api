const URLS = require("./test-urls");
const {Nodes} = require("../nodes");


async function example() {
    const nodesFromFolder = await Nodes.nodes(URLS.CAT_FOLDER);
    const nodesFromFile   = await Nodes.nodes(URLS.CAT_FILE_IMAGE);
    console.log(nodesFromFolder.root);
    console.log("[1] ---");
    console.log(nodesFromFolder);
    console.log("[2] ---");
    console.log(nodesFromFile);
}



!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();