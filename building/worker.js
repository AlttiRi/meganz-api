import {Worker, isMainThread, parentPort, workerData} from "worker_threads";


export function workerWrapper(executable, filename, name) {
    return function(runInWorker = true) {
        if (runInWorker && isMainThread) {
            return handle({filename, name});
        }
        return executable();
    }
}

function handle(workerData) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL(import.meta.url), {workerData});
        worker.on("message", resolve);
        worker.on("error", reject);
        worker.on("exit", code => {
            if (code !== 0) {
                console.error("Worker finished with exit code " + code);
            }
        });
    });
}

// [auto-run]
!async function workerMain() {
    if (isMainThread) {
        return;
    }
    const module = await import(workerData.filename);
    if (workerData.name) {
        const executable = module[workerData.name];
        const result = await executable();
        parentPort.postMessage(result);
    } else
        if (module.default) {
        parentPort.postMessage(await module.default());
    } else {
        const keys = Object.keys(module);
        if (keys.length > 1) {
            throw "There are more than 1 export. " +
            "Use the 3rt parameter of `workerWrapper` or the default export to specify the method " +
            "that is required to run in the worker thread.";
        }
        const executable = module[keys[0]];
        parentPort.postMessage(await executable());
    }
}();