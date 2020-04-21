const URLS = require("./test-urls-private");
const FileAttributes = require("../file-attributes");
const {progress} = require("./promise-progress");
const {Nodes} = require("../nodes");
const {util} = require("../util");


async function example() {
    progress(util.sleep(18000), "Total");
    await progress(util.sleep(2000), "Waiting");

    //const nodes = await progress(Nodes.nodes(URLS.FOLDER_175));
    //await progress(util.sleep(6000), "Waiting");

    progress(util.sleep(5000), "Loading");
    progress(util.sleep(2000), "Loading");
    await progress(util.sleep(2000), "Waiting");
    progress(util.sleep(5000), "Loading");
    progress(util.sleep(2000), "Loading");
    progress(util.sleep(9000), "Loading");
    util.sleep(2000).then(_ => progress(util.sleep(2000), "Loading"));
    await progress(util.sleep(12000), "Waiting");
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();