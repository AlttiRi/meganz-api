import * as URLS from "./test-urls-private.js";
import Util from "../util.js";
import Mega from "../mega.js";
import Nodes from "../nodes.js";
import Share from "../share.js";
import FileAttributes from "../file-attributes.js";



async function example() {
    const nodes = await Nodes.nodes(URLS.FOLDER_136_FILES);
    console.log(nodes);
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();