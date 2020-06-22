import {WorkerHolder} from "./worker-holder-1-single.js";
console.log("[main]");



!async function demo() {
    console.time("demo");

    const data1 = WorkerHolder.postMessage("./util.js", "func1");
    console.log("result1:", await data1);

    await new Promise(resolve => setTimeout(resolve, 900));

    const data2 = WorkerHolder.postMessage("./util.js", "func2");
    console.log("result2:", await data2);

    console.log("result:", await data1, await data2);

    console.log("wait");
    // await new Promise(resolve => setTimeout(resolve, 4900));
    console.timeEnd("demo");
}();


