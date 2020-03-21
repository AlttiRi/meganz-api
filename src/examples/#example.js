const URLS = require("./test-urls-private");
const {util} = require("../util");
const {Nodes} = require("../nodes");
const {CountDownLatch} = require("../synchronization");


async function example() {
    // see others ex files
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();