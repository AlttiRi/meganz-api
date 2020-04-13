const URLS = require("./test-urls-private");
const {util} = require("../util");
const {Nodes} = require("../nodes");
const {Share} = require("../nodes");

async function example() {
    // const nodesFromFolder = await Nodes.nodes(URLS.SELECTED_FOLDER_WITH_UNDECRYPTED_FILE);
    // console.log(nodesFromFolder);
    //
    const url = URLS.CAT_FOLDER_NO_KEY_SELECTED_FOLDER_2;
    const share = Share.fromUrl(url);
    console.log(url);
    console.log(share.getUrl(true));
    console.log();
    console.log(share.toString());
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();