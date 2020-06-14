import * as URLS from "./test-urls.js";
import {FileAttributes, Nodes} from "../src/mega.js";
import {saveFile} from "./util-node.js";

async function example() {
    const fileNode = await Nodes.node(URLS.CAT_FILE_IMAGE);
    console.log("--- [FILE_NODE] ---");
    console.log(fileNode);

    const thumb = await fileNode.getThumbnail(); // FileAttributes.getThumbnail(nodeFromFile) // the same
    const saved1 = saveFile(thumb, `thumb-${fileNode.id}.jpg`, fileNode.mtime);

    const preview = await FileAttributes.getPreview(fileNode);
    const saved2 = saveFile(preview, `preview-${fileNode.id}.jpg`, fileNode.mtime);

    return Promise.all([saved1, saved2]);
}



!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();