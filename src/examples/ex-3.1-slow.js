import * as URLS from "./test-urls-private.js";
import {saveFile} from "../util-node.js";
import {
    Nodes
} from "../m.js";


// Too slow, needs the parallel downloading
async function example() {
    const folderNodes = await Nodes.nodes(URLS.FOLDER_136_FILES);
    for (const node of folderNodes) {
        if (Nodes.isMediaNode(node)) {
            const thumb = await node.getThumbnail();
            saveFile(thumb, `thumb-${node.id}.jpg`, node.mtime);
        }
    }
}



!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();