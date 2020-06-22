import {isMainThread, parentPort, Worker} from "worker_threads";

export class WorkerHolder {
    static queue = [];
    static _worker;
    static free = true;
    static promises = [];


    static get worker() {
        if (WorkerHolder._worker) {
            return WorkerHolder._worker;
        } else {
            const worker = new Worker(new URL(import.meta.url));

            const handler = async message => {
                const promise = WorkerHolder.promises.shift();
                if (message.code === "done") {
                    promise.resolve(message.result);
                } else if (message.code === "error") {
                    promise.reject(message.result);
                }

                // It saves ~30 ms // (uses only one thread) // when `WorkerHolder.postMessage` is used one by one
                // await new Promise(resolve => process.nextTick(resolve)); // or
                // await new Promise(resolve => setTimeout(resolve, 5));


                if (WorkerHolder.queue.length) {
                    const task = WorkerHolder.queue.shift();
                    worker.once("message", handler);
                    worker.postMessage(task);
                } else {
                    worker.postMessage("die");
                    WorkerHolder._worker = null;
                    WorkerHolder.free = true;
                }
            };
            worker.once("message", handler);
            worker.on("exit", code => console.error("Worker finished with exit code " + code));

            WorkerHolder._worker = worker;
            return worker;
        }
    }

    static postMessage(module, name = "default") {
        const promise = new Promise((resolve, reject) => {
            WorkerHolder.promises.push({resolve, reject});
        });

        WorkerHolder.worker; // init
        if (WorkerHolder.free) {
            WorkerHolder.worker.ref();
            WorkerHolder.worker.postMessage({module, name});
            WorkerHolder.free = false;
        } else {
            WorkerHolder.queue.push({module, name});
        }

        return promise;
    }
}

// Worker code
if (!isMainThread) {
    console.log("[worker]");
    const listener = async message => {
        if (message === "die") {
            console.log("dieing");
            parentPort.removeListener("message", listener);
            return;
        }
        try {
            const {module: modulePath, name} = message;
            const module = await import(modulePath);
            const result = await module[name]();
            parentPort.postMessage({code: "done", result});
        } catch (error) {
            parentPort.postMessage({code: "error", error});
        }
    }
    parentPort.on("message", listener);
}