const URLS = require("./test-urls");
const {util} = require("./util");
const logger = util.logger;
const {mega} = require("./mega");
const {Nodes} = require("./nodes");


!async function test() {

    const nodesFromFolder = await Nodes.nodes(URLS.CAT_FOLDER);
    const nodesFromFile   = await Nodes.nodes(URLS.CAT_IMAGE_FILE);
    console.log(nodesFromFolder.root);
    console.log("[1] ---");
    console.log(nodesFromFolder);
    console.log("[2] ---");
    console.log(nodesFromFile);

    const nodeFromFile = await Nodes.node(URLS.CAT_IMAGE_FILE);
    console.log("[3] ---");
    console.log(nodeFromFile);

    const nodeFromFolder = await Nodes.node(URLS.CAT_FOLDER_SELECTED_FILE);
    console.log("[4] ---");
    console.log(nodeFromFolder);

}();