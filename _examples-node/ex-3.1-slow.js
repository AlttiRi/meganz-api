import * as URLS from "./test-urls-private.js";
import {Nodes} from "../src/mega.js";
import {saveFile} from "./util-node.js";

// It downloads thumbnails one by one.
// And it works too slow. It needs the parallel downloading.

// Note: There is an optimization even for this case: downloadUrl's for each bunch will be cached
// (it decreases the total count of API requests, and speed up the work of this script)

async function example() {
    const folderNodes = await Nodes.nodes(URLS.FOLDER_136_FILES);
    for (const node of folderNodes) {
        if (Nodes.isMediaNode(node)) {
            const thumb = await node.getThumbnail();
            saveFile(thumb, `thumb-${node.id}.jpg`, node.mtime).then(/*Nothing*/);
        }
    }
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();