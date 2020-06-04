import {saveFile} from "../util-node.js";
import * as URLS from "./test-urls.js";
import {
    FileAttributes,
    Nodes,
} from "../mega.js";

async function example() {
    const nodeFromFile = await Nodes.node(URLS.CAT_FILE_IMAGE);
    console.log(nodeFromFile);

    //const thumb = await FileAttributes.getThumbnail(nodeFromFile);
    // or
    const thumb = await nodeFromFile.getThumbnail();
    saveFile(thumb, `thumb-${nodeFromFile.id}.jpg`, nodeFromFile.mtime);

    const preview = await FileAttributes.getPreview(nodeFromFile);
    saveFile(preview, `preview-${nodeFromFile.id}.jpg`, nodeFromFile.mtime);

    const nodeFromFolder = await Nodes.node(URLS.CAT_FOLDER_SELECTED_FILE);
    console.log("");
    console.log(nodeFromFolder);
}



!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();