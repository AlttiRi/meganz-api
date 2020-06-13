import {task} from "./task.js";

!async function run() {
    console.time("run");

    const promises = [];
    for (let i = 0; i < 3; i++) {
        console.log(`run... [${i}]`);
        promises.push(task());
    }

    const results = await Promise.all(promises);
    results.forEach(result => console.log(result));

    console.timeEnd("run");
}();