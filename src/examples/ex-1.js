import * as URLS from "./test-urls.js";
import * as Mega from "../m.js";

async function example() {
    const nodesFromFolder = await Mega.nodes(URLS.CAT_FOLDER);
    const nodesFromFile   = await Mega.nodes(URLS.CAT_FILE_IMAGE);
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