import * as URLS from "./test-urls-private.js";
import {saveFile} from "./util-node.js";
import {progress} from "./progress.js";
import {performance} from "../src/browser-context.js";

import {
    Nodes,
    FileAttributes,
    Util,
    MegaApi
} from "../src/mega.js";


async function example() {
    const nodes = await progress(Nodes.nodes(URLS.FOLDER_136_FILES), "Nodes info fetching");
    const promises = [];
    let i = 0;
    for (const node of nodes) {
        if (Nodes.isMediaNode(node)/* && i < 151*/) {
            promises.push(handle(node, i++));
        }
    }
    await Promise.all(promises);
}

async function handle(node, index) {
    const {Thumbnail} = FileAttributes;

    // Break grouped downloading of `downloadUrl`.
    // await progress(Util.sleep(1), "Waiting for a delay in cycle");    // [commented][v1]
    // await Util.nextEventLoopTask();                                   // [commented][v2]

    // Uncomment, if you use `Thumbnail.getDownloadUrl({node}, false)` in order to no use cached `downloadUrl`s:
    // MegaApi.grouped = false; // To disable grouped API request        // [commented]
    const downloadUrl = await progress(Thumbnail.getDownloadUrl({node}, true), "URL fetching");


    // Break grouped downloading of encrypted bytes
    // await progress(Util.sleep(10), "Waiting for a delay");            // [commented][v1]
    // await Util.nextEventLoopTask();                                   // [commented][v2]
    const encryptedBytes = await Thumbnail.getEncryptedBytes({node, downloadUrl}, true);  // [v1-bytes]
    // Comment the right part to skip decrypting
    let bytes /*//*/ = await Thumbnail.getBytes({node, encryptedBytes}); // [uncommented] // [v1-bytes]

    // Download encrypted bytes and decrypt:
    // const bytes = await Thumbnail.getBytes({node, downloadUrl});      // [commented][v2-bytes]


    const bunchId = node.thumbnail.bunch.id;
    // 1600000000 seconds is the fake date - 2020.09.13 // is used for sorting in the explorer
    // Note: `performance.now()` returns milliseconds, but the value is used as seconds.
    const mtime = Math.trunc(performance.now()) + 1600000000;

    await saveFile(bytes || encryptedBytes, `thumb-${bunchId}-${index.toString().padStart(3, "0")}.jpg`, mtime);
}

!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();
