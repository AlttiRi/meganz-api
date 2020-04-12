const {util} = require("./util");

//todo setter for `max`, `delay` (the check > 0), disable() method
class Semaphore {

    max;
    delay;

    /**
     * The count of "threads" that called `acquire` method, but not released yet
     * @type {number}
     */
    #count = 0;
    /**
     * The queue of Promises's `resolve`s (callback param) for "threads" that are not fitted in `max` limit
     * @type {function[]}
     */
    #queue = [];

    /**
     * By default works like a mutex
     * To disable set `max` to `Number.MAX_SAFE_INTEGER`
     * @param {number} max   - max count of parallel executions
     * @param {number} delay - a delay before realise (ms)
     */
    constructor(max = 1, delay = 0) {
        if (max < 1) {
            max = 1;
        }
        this.max = max;
        this.delay = delay;
    }

    /** @return {Promise<void>} */
    acquire() {
        console.log(`[Semaphore] Acquired: ${this.#count}${this.#count < this.max ? "" : " and added to a queue"}`);

        let promise;
        if (this.#count < this.max) {
            promise = Promise.resolve();
        } else {
            promise = new Promise(resolve => {
                this.#queue.push(resolve);
            });
        }

        this.#count++;
        return promise;
    }

    /**
     * You may note the delay before finishing of the program because of the delay of the semaphore
     */
    release() {
        util.sleep(this.delay)
            .then(_ => {
                console.log(`[Semaphore] Released: ${this.#count}${this.#queue.length > 0 ? " from the queue" : ""}`);
                if (this.#queue.length > 0) {
                    const resolve = this.#queue.shift();
                    resolve();
                }
                this.#count--;
            });
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
            console.log(`[CountDownLatch] Left: ${this.count}`);
            if (this.count === 0) {
                this.#resolve();
            }
        }
    }

    /** @return {Promise<void>} */
    wait() {
        if (this.count > 0) {
            console.log(`[CountDownLatch] Waiting for ${this.count} count downs...`);
        }
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