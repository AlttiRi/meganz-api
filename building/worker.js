import {Worker, isMainThread, parentPort} from "worker_threads";

// Note: `console.log` is not synchronized.
export class WorkerThread {
    /** @private
     *  @type {import("worker_threads").Worker} */
    worker;
    /** @type {"free", "busy", "terminated"} */
    state = "terminated";
    /** @private
     *  @type {{resolve: function(value), reject: function(value)}[]} */
    promises = [];
    /** @private
     *  @type {{module: string, name: string}[]} */
    tasks = [];

    /** @private */
    init() {
        this.worker = new Worker(new URL(import.meta.url));
        this.worker.on("message", this.messageHandler);
        this.worker.on("error", this.errorHandler);
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
        return code => {
            if (code !== 0) {
                console.log("Worker finished with exit code " + code);
            }
        };
    }
    /** @private */
    get errorHandler() {
        return error => {
            console.error("Unexpected worker error.")
            throw error;
        }
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

    /**
     * @template T
     * @param {T} executable
     * @param {string} filename
     * @param {string} name
     * @returns {T}
     */
    wrap(executable, filename, name = executable.name) {
        return workerWrapper(executable, filename, name, this);
    }
}

/**
 * @template T
 * @param {T} executable
 * @param {string} filename
 * @param {string} name
 * @param {{execute: function(filename: string, name: string)}} executor
 * @returns {T}
 */
export function workerWrapper(executable, filename, name = executable.name, executor) {
    return function(runInWorker = true) {
        if (runInWorker && isMainThread) {
            if (executor) {
                return executor.execute(filename, name);
            }
            const worker = new WorkerThread();
            return worker.execute(filename, name);
        }
        return executable();
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

        // if `name` is not specified, and there is no default export
        async function noDefaultHandler(module) {
            const keys = Object.keys(module);
            if (keys.length > 1) {
                throw "No specified method to execute, default export not found and there are more than 1 export.";
            } else if (keys.length === 0){
                throw "No export to execute.";
            }
            const executable = module[keys[0]];
            const result = await executable();
            parentPort.postMessage(result);
        }

        try {
            const {module: modulePath, name} = message;
    console.log(name)
            const module = await import(modulePath);
            if (name === "default" && !module["default"]) {
                return await noDefaultHandler(module);
            }
            const result = await module[name]();
            parentPort.postMessage({code: "done", result});
        } catch (error) {
            parentPort.postMessage({code: "error", error});
        }
    }
    parentPort.on("message", listener);
}