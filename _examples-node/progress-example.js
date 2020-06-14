import {progress} from "./progress.js";
import {Util} from "../src/mega.js";
const sleep = Util.sleep;


async function example() {
    const promises = [];
    promises.push(progress(sleep(18000), "Total"));
    await progress(sleep(2000), "Waiting");

    promises.push(progress(sleep(5000), "Loading"));
    promises.push(progress(sleep(2000), "Loading"));
    await progress(sleep(2000), "Waiting");
    promises.push(progress(sleep(5000), "Loading"));
    promises.push(progress(sleep(2000), "Loading"));
    promises.push(progress(sleep(9000), "Loading"));
    sleep(2000).then(_ => progress(sleep(2000), "Loading"));
    await progress(sleep(12000), "Waiting");

    return Promise.all(promises);
}

!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();