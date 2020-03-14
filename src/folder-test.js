const {util} = require("./util");
const logger = util.logger;
const {mega} = require("./mega");
const {Nodes} = require("./nodes");


!async function test() {
    let urlFile = "https://mega.nz/#!bkwkHC7D!AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk"; // a cat file

    let urlFolder = "https://mega.nz/#F!e1ogxQ7T!ee4Q_ocD1bSLmNeg9B6kBw?P8BBzaTS"; // a cat folder
    //  urlFolder = "https://mega.nz/#F!e1ogxQ7T"; // a cat folder - no key


    let nodes1 = await Nodes.nodes(urlFolder);
    let nodes2 = await Nodes.nodes(urlFile);
    console.log(nodes1.root);
    console.log("---");
    console.log(nodes1);
    console.log("---");
    console.log(nodes2);

    let node = await Nodes.node(urlFile);
    console.log("---");
    console.log(node);

}();