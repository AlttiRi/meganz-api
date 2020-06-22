import {WorkerPool} from "./worker-pool.js";
console.log("[main]");



!async function demo() {
    console.time("demo");

    const workers = new WorkerPool(2);

    const data1 = workers.execute("./util.js", "func1");
    // console.log("result1:", await data1);

    // await new Promise(resolve => setTimeout(resolve, 800));
    // Worker.terminate();

    const data2 = workers.execute("./util.js", "func2");
    const data4 = workers.execute("./util.js", "func2");
    const data3 = workers.execute("./util.js", "func1");
    // console.log("result2:", await data2);

    console.log("result:", await data1, await data2, await data3, await data4);

    console.log("wait");
    // await new Promise(resolve => setTimeout(resolve, 490));
    console.timeEnd("demo");
}();


