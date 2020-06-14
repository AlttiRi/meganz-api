import {Worker, isMainThread, parentPort, workerData} from "worker_threads";

export function workerWrapper(executable, filename) {
    return function (runInWorker = true) {
        if (runInWorker && isMainThread) {
            return handle(filename, {filename});
        }
        return executable();
    }
}

function handle(filename, workerData) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL(filename), {workerData});
        worker.on("message", resolve);
        worker.on("error", reject);
        worker.on("exit", code => {
            if (code === 0) {
                console.log("Worker finished with exit code 0");
            } else {
                console.error("Worker finished with exit code " + code);
            }
        });
    });
}

!async function runInWorker() {
    if (isMainThread) {
        return;
    }
    const module = await import(workerData.filename);
    if (module.default) {
        parentPort.postMessage(await module.default());
    } else  {
        const keys = Object.keys(module);
        if (keys.length > 1) {
            throw "There are more than 1 export. " +
            "Use the default export to specify the method that is required to run in the worker thread.";
        }
        const executable = module[keys[0]];
        parentPort.postMessage(await executable());
    }
}();