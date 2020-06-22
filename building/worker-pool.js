import {WorkerThread, workerWrapper} from "./worker.js";
export {WorkerThread} from "./worker.js";

export class WorkerPool {
    /** @private
     *  @type {WorkerThread[]} */
    workers = [];
    /** @private
     *  @type {number} */
    limit;
    /** @private
     *  @type {number} */
    counter = 0;

    constructor(limit = 1) {
        if (limit < 1) {
            throw `Invalid argument "limit": "${limit}"`;
        }
        this.limit = limit;
    }

    /**
     * @param {string} module - the module path
     * @param {string} [name="default"] - the function to run
     * @returns {Promise}
     */
    execute(module, name = "default") {
        const worker = this.getWorker();
        return worker.execute(module, name);
    }

    terminate() {
        this.workers.forEach(worker => worker.terminate());
    }

    /** @private */
    getWorker() {
        const free = this.workers.filter(worker => worker.state === "free");
        if (free.length) {
            console.log("1. Reusing of the available worker.");
            return free.shift();
        } else if (free.length === 0 && this.workers.length < this.limit) {
            console.log("2. Adding the new worker to the pool.");
            const worker = new WorkerThread();
            this.workers.push(worker);
            return worker;
        } else {
            const number = this.counter++ % this.limit;
            console.log(`3. Adding the task to the queue of the working worker with № ${number}`);
            return this.workers[number];
        }
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