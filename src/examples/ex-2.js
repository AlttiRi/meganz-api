const FileAttributes = require("../file-attributes");
const URLS = require("./test-urls");
const {Nodes} = require("../nodes");
const {Util} = require("../util");


async function example() {
    const nodeFromFile = await Nodes.node(URLS.CAT_FILE_IMAGE);
    console.log(nodeFromFile);

    //const thumb = await FileAttributes.getThumbnail(nodeFromFile);
    // or
    const thumb = await nodeFromFile.getThumbnail();
    Util.saveFile(thumb, `thumb-${nodeFromFile.id}.jpg`, nodeFromFile.mtime);

    const preview = await FileAttributes.getPreview(nodeFromFile);
    Util.saveFile(preview, `preview-${nodeFromFile.id}.jpg`, nodeFromFile.mtime);

    const nodeFromFolder = await Nodes.node(URLS.CAT_FOLDER_SELECTED_FILE);
    console.log("");
    console.log(nodeFromFolder);
}



!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();