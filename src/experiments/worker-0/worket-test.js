import {Worker, isMainThread, parentPort, workerData} from "worker_threads";
import {fileURLToPath} from "url";
const __filename = fileURLToPath(import.meta.url);

globalThis.task = task;

export function handle(workerData) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {workerData});
        worker.on("message", resolve);
        worker.on("error", reject);
        worker.on("exit", code => {
            console.log(code);
        });
    });
}
!async function run() {
    if (!isMainThread) {
        parentPort.postMessage(await handler(workerData));
    }
}();

function handler(workerData) {
    return globalThis[workerData.func](workerData.data);
}

async function task(data) {
    console.log("received:", data);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("task completed...");
    return `task completed (${data})`;
}


!async function main() {
    console.time("main");
    if (!isMainThread) {
        return;
    }

    const result = await handle({func: task.name, data: "text-1" });
    console.log(result);

    console.timeEnd("main");
}();