const URLS = require("./test-urls-private");
const FileAttributes = require("../file-attributes");
const {progress} = require("./promise-progress");
const {Nodes} = require("../nodes");
const {Util} = require("../util");
const sleep = Util.sleep;


async function example() {
    progress(sleep(18000), "Total");
    await progress(sleep(2000), "Waiting");

    //const nodes = await progress(Nodes.nodes(URLS.FOLDER_175));
    //await progress(sleep(6000), "Waiting");

    progress(sleep(5000), "Loading");
    progress(sleep(2000), "Loading");
    await progress(sleep(2000), "Waiting");
    progress(sleep(5000), "Loading");
    progress(sleep(2000), "Loading");
    progress(sleep(9000), "Loading");
    sleep(2000).then(_ => progress(sleep(2000), "Loading"));
    await progress(sleep(12000), "Waiting");
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();