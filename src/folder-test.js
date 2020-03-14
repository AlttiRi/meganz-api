const URLS = require("./test-urls");
const {util} = require("./util");
const logger = util.logger;
const {mega} = require("./mega");
const {Nodes} = require("./nodes");


!async function test() {

    let nodes1 = await Nodes.nodes(URLS.CAT_FOLDER);
    let nodes2 = await Nodes.nodes(URLS.CAT_IMAGE_FILE);
    console.log(nodes1.root);
    console.log("---");
    console.log(nodes1);
    console.log("---");
    console.log(nodes2);

    let node = await Nodes.node(URLS.CAT_IMAGE_FILE);
    console.log("---");
    console.log(node);

}();