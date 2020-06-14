import * as URLS from "./test-urls.js";
import * as Mega from "../src/mega.js";


async function example() {
    console.log("--- [CAT_FILE_IMAGE] ---");
    const nodesFromFile   = await Mega.node(URLS.CAT_FILE_IMAGE);
    console.log(nodesFromFile);

    console.log("--- [CAT_FOLDER_NODE] ---");
    const nodeFromFolder = await Mega.node(URLS.CAT_FOLDER_SELECTED_FILE);
    console.log(nodeFromFolder);

    console.log("--- [CAT_FOLDER_NODES] ---");
    const nodesFromFolder = await Mega.nodes(URLS.CAT_FOLDER);
    console.log(nodesFromFolder.root);
    console.log("---  ---");
    console.log(nodesFromFolder);
}

!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();