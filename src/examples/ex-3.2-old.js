import * as URLS from "./test-urls-private.js";
import {saveFile} from "../util-node.js";
import {
    Nodes,
    Util,
    Api
} from "../m.js";


// to simulate the old behavior (without a semaphore)
Api.semaphore.max = Number.MAX_SAFE_INTEGER;


// Not ideal, but works (old version, now there is a semaphore)
async function example() {
    const folderNodes = await Nodes.nodes(URLS.FOLDER_136_FILES);

    let errors = 0;
    let count = 0;
    await walkThroughFolder(folderNodes.root);

    async function walkThroughFolder(folder) {
        console.log(folder.name + " :files: -----------------------------------------------------");

        for (const node of folder.files) {
            console.log(folder.name + "/" + node.name);
            if (Nodes.isMediaNode(node)) {
                // max safe connection count is 63
                if (count === 63) {
                    console.log("---await---");
                    await Util.sleep(4000); // will be errors if it is less // UPD: No, due to there is "grouped request" optimization now
                    console.log("---reset---");
                    count = 0;
                }
                console.log(++count);
                node.getThumbnail()
                    .then(thumb => {
                        saveFile(thumb, `thumb-${node.id}.jpg`, node.mtime);
                    })
                    .catch(error => {
                        errors++;
                        console.error(errors + " " + folder.name + "/" + node.name + " -------ERROR-------");

                        // FetchError: request to https://g.api.mega.co.nz/cs failed, reason: write EPROTO 1264...
                        //console.error(error);
                    });
            }
        }
        console.log(folder.name + " :folders: -----------------------------------------------------");
        for (const node of folder.folders) {
            await walkThroughFolder(node);
        }
    }
}



!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();