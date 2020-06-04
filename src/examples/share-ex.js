import * as URLS from "./test-urls-private.js";
import {
    Share
} from "../m.js";


async function example() {
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