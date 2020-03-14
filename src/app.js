const URLS = require("./test-urls");
const { util } = require("./util");
const { mega } = require("./mega");

// todo if file have no file attributes
!async function app() {

    const node = await mega.getNode(URLS.CAT_IMAGE_FILE);
    console.log(node);
    console.log(node.modificationDateFormatted);
    console.log(util.bytesToSize(node.size));

    const thumb = await node.getThumbnail();
    util.saveFile(thumb, "thumb.jpg", node.mtime);

    const preview = await node.getPreview();
    util.saveFile(preview, "preview.jpg", node.mtime);

}();