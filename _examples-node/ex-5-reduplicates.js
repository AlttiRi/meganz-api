import * as URLS from "./test-urls-private.js";
import {Nodes} from "../src/mega.js";

// If a user upload the same file, it will be reduplicated, so:
// If nodes has the same `size`, `modificationDate`, `nodeKey`, `fileAttributesStr` and `ownerId` - it's the same file (re-duplicated).
// The `name`, `creationDate` _may_ be different.
async function example() {
    const nodes1 = await Nodes.nodes(URLS.FOLDER_WITH_DUBS_1_MY);
    const nodes2 = await Nodes.nodes(URLS.FOLDER_WITH_DUBS_2_MY);
    console.log("\n-----\n");

    nodes1
        .files
        .sort((a, b) => a.fileAttributesStr > b.fileAttributesStr ? 1 : -1)
        .forEach(node =>
            console.log(node.mtime + " - " + node.fileAttributesStr + " - " + node.name/*, node.nodeKey*/)
        );

    console.log("\n-----\n");

    nodes2
        .files
        .sort((a, b) => a.fileAttributesStr > b.fileAttributesStr ? 1 : -1)
        .forEach(node =>
            console.log(node.mtime + " - " + node.fileAttributesStr + " - " + node.name/*, node.nodeKey*/)
        );
}


!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();