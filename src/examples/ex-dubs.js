const URLS = require("./test-urls-private");
const {Nodes} = require("../nodes");

// If a user upload the same file it will be reduplicated, so:
// If nodes has the same `size`, `modificationDate`, `nodeKey`, `fileAttributesStr` and `ownerId` - it's the same file (re-duplicated).
// The `name`, `creationDate` _may_ be different.
async function example() {

    (await Nodes.nodes(URLS.FOLDER_WITH_DUBS_1_MY))
        .sort((a, b) => { return a.fileAttributesStr > b.fileAttributesStr ? 1 : -1; })
        .forEach(node => console.log(node.name + " - " + node.mtime + " - " + node.fileAttributesStr/*, node.nodeKey*/));

    console.log();

    (await Nodes.nodes(URLS.FOLDER_WITH_DUBS_2_MY))
        .sort((a, b) => { return a.fileAttributesStr > b.fileAttributesStr ? 1 : -1; })
        .forEach(node => console.log(node.name + " - " + node.mtime + " - " + node.fileAttributesStr/*, node.nodeKey*/));
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();