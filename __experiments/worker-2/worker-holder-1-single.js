import {isMainThread, parentPort, Worker} from "worker_threads";

export class WorkerHolder {
    static queue = [];
    static _worker;
    static free = true;
    static promises = [];
    static timerId = null;


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

                if (WorkerHolder.queue.length) {
                    const task = WorkerHolder.queue.shift();
                    worker.postMessage(task);
                } else {
                    WorkerHolder.timerId = setTimeout(() => {
                        worker.postMessage("die");
                        WorkerHolder._worker = null;
                    }, 4800);

                    WorkerHolder.free = true;
                    worker.unref();
                }
            };
            worker.on("message", handler);
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
            if (WorkerHolder.timerId) {
                clearTimeout(WorkerHolder.timerId);
                WorkerHolder.timerId = null;
            }
            WorkerHolder.free = false;
            WorkerHolder.worker.ref();
            WorkerHolder.worker.postMessage({module, name});
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