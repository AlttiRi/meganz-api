const { util } = require("./util");
const { mega } = require("./mega");

// todo if file have no file attributes
!async function app() {
    let link = "https://mega.nz/#!bkwkHC7D!AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk"; // a cat jpg

    const node = await mega.getNode(link);
    console.log(node);
    console.log(node.modificationDateFormatted);
    console.log(util.bytesToSize(node.size));

    const thumb = await node.getThumbnail();
    util.saveFile(thumb, "thumb.jpg", node.mtime);

    const preview = await node.getPreview();
    util.saveFile(preview, "preview.jpg", node.mtime);

}();