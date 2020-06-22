import {isMainThread, parentPort, Worker} from "worker_threads";

// Note: `console.log` is not synchronized.

export class WorkerThread {
    /** @private
     *  @type {import("worker_threads").Worker} */
    worker;
    /** @type {"free", "busy", "terminated"} */
    state;
    /** @private
     *  @type {{resolve: function(value), reject: function(value)}[]} */
    promises = [];
    /** @private
     *  @type {{module: string, name: string}[]} */
    tasks = [];

    constructor() {
        this.init();
    }

    /** @private */
    init() {
        this.worker = new Worker(new URL(import.meta.url));
        this.worker.on("message", this.messageHandler);
        this.worker.on("exit", this.exitHandler);

        this.state = "free";
        this.worker.unref();
    }

    /** @private */
    get messageHandler() {
        return async message => {
            const promise = this.promises.shift();
            switch (message.code) {
                case "done":
                    promise.resolve(message.result);
                    break;
                case "error":
                    promise.reject(message.result);
                    break;
                default:
                    throw "Unknown message code: " + message.code;
            }
            if (this.tasks.length) {
                const task = this.tasks.shift();
                this.worker.postMessage(task);
            } else {
                this.state = "free";
                this.worker.unref();
            }
        };
    }

    /** @private */
    get exitHandler() {
        return code => console.error("Worker finished with exit code " + code);
    }

    terminate() {
        this.state = "terminated";
        this.worker.postMessage("terminate");
        this.worker = null;
    }

    /**
     * @param {string} module - the module path
     * @param {string} [name="default"] - the function to run
     * @returns {Promise}
     */
    execute(module, name = "default") {
        const promise = new Promise((resolve, reject) => {
            this.promises.push({resolve, reject});
        });
        if (this.state === "terminated") {
            this.init();
        }
        if (this.state === "free") {
            this.state = "busy";
            this.worker.ref();
            this.worker.postMessage({module, name});
        } else if (this.state === "busy") {
            this.tasks.push({module, name});
        }
        return promise;
    }
}


// Worker code
if (!isMainThread) {
    console.log("[worker]");
    const listener = async message => {
        if (message === "terminate") {
            console.log("terminating...");
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