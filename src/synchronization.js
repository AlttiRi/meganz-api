const {Util} = require("./util");
const performance = require("./browser-context").performance;

class Semaphore {
    /**
     * By default works like a mutex
     * @param {number} limit - the max count of parallel executions
     * @param {number} time  - the time within which does not allowed to perform more than `limit` operations. (ms)
     */
    constructor(limit = 1, time = 0) {
        this.limit = limit;
        this.delay = time;
    }

    /** @type {number} - the count of active parallel executions */
    #active = 0;
    /** @type {(function: void)[]} - resolve functions of enqueued executions */
    #pending = [];
    /** @type {number[]} - finish times of completed executions (it's used when there is no enqueued executions) */
    #completeTimes = [];

    /** @return {Promise<void>} */
    async acquire() {
        if (this.isDisabled) {
            return;
        }

        const completed = this.#completeTimes.length;
        if (completed > 0 && completed === this.limit - this.#active) {
            const time = this.#delay - (performance.now() - this.#completeTimes.shift());
            console.log("completed: " + completed + ", active: " + this.#active + ", wait: " + time);
            await Util.sleep(time);
        }

        if (this.#active < this.limit) {
            this.#active++;
            return;
        }

        return new Promise(resolve => {
            this.#pending.push(resolve);
        });
    }

    /**
     * Recommendation: release in a finally block.
     */
    release() {
        // Just do not return a Promise
        this._release().then(/*ignore promise*/);
    }

    /** @private */
    async _release() {
        if (this.isDisabled) {
            return;
        }

        if (this.#active > 0) {
            this.#active--;

            if (this.#pending.length > 0) {
                const resolve = this.#pending.shift();
                this.#active++;
                await Util.sleep(this.#delay);
                resolve();
            } else if (this.#delay > 0) {
                this.#completeTimes.push(performance.now());
            }
        } else {
            console.warn("[Semaphore] over released"); // a possible error is in a code
        }
    }

    /**
     * Note (It's important, in other case the semaphore will not work):
     * When you want to limit the parallel execution count of an async function
     * use `return` statement in the "executable" callback,
     * or use `await` statement in the "executable" callback if you do not need the result.
     *
     * @example
     * const semaphore = new Semaphore(4);
     * for (const value of values) {
     *      semaphore.sync(() => {
     *          return handle(value);
     *      }).then(console.log); // result of `handle`
     * }
     * @example
     * const semaphore = new Semaphore(4);
     * for (const value of values) {
     *      semaphore.sync(async () => {
     *          await handle(value);
     *      }).then(console.log); // `undefined`
     * }
     *
     * @param {function(): Promise<*>} executable
     * @return {Promise<*>}
     */
    async sync(executable) {
        try {
            await this.acquire();
            return await executable();
        } finally {
            this.release();
        }
    }

    /**
     * Release all waiters without any delay
     */
    releaseAll() {
        while (this.#pending.length) {
            const resolve = this.#pending.shift();
            resolve();
        }
        this.#active = 0;
        this.#completeTimes = [];
    }

    #limit;
    #delay;

    set limit(value) {
        if (value < 1) {
            this.#limit = 1;
        } else {
            this.#limit = value;
        }
    }

    get limit() {
        return this.#limit;
    }

    set delay(value) {
        if (value < 0) {
            this.#delay = 0;
        } else {
            this.#delay = value;
        }
    }

    get delay() {
        return this.#delay;
    }

    isDisabled = false;

    disable(releaseAll = true) {
        if (releaseAll) {
            this.releaseAll();
        }
        this.isDisabled = true;
    }

    enable() {
        this.isDisabled = false;
    }

    /**
     * Static factory method, works as constructor.
     * Returns the disabled semaphore.
     * Pass it to a code that expect a semaphore, but you do not need it.
     */
    static disabled(max = 1, delay = 0) {
        const semaphore = new Semaphore(max, delay);
        semaphore.disable();
        return semaphore;
    }
}

class CountDownLatch {
    count;
    #promise;
    #resolve;

    /** @param {number} count */
    constructor(count = 0) {
        this.count = count;
        if (count > 0) {
            this.#promise = new Promise(resolve => {
                this.#resolve = resolve;
            });
        } else {
            this.#promise = Promise.resolve();
        }
    }

    countDown() {
        if (this.count > 0) {
            this.count--;
            if (this.count === 0) {
                this.#resolve();
            }
        }
    }

    /** @return {Promise<void>} */
    wait() {
        return this.#promise;
    }

    /** @return {boolean} */
    get released() {
        return this.count > 0;
    }

    release() {
        this.#resolve();
    }
}


module.exports = {Semaphore, CountDownLatch};