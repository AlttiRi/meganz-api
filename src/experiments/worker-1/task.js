import {workerWrapper} from "./worker.js";

async function _task() {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("task completed...");
    return "task completed";
}

export const task = workerWrapper(_task, import.meta.url);