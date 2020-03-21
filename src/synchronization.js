const {util} = require("./util");

class Semaphore {

    max;
    delay; // a delay before realise
    count = 0;
    queue = [];

    /**
     * max parallel requests count is `63`,
     * but in this case it needs delay before realise ~ `3500`+ or Fetch error (reason: write EPROTO) will happen
     *
     * Example values:
     * 63, 3500
     * 8, 0
     */
    constructor(max = 12, delay = 200) {
        this.max = max;
        this.delay = delay;
    }

    async acquire() {
        console.log("--- acquire " + (this.count + 1));
        if (this.count < this.max) {
            this.count++;
            return Promise.resolve();
        } else  {
            this.count++;
            let resolver;
            const promise = new Promise((resolve, reject) => {
                resolver = resolve;
            });
            this.queue.push(resolver);
            return promise;
        }
    }

    async release() {
        this.count--;
        console.log("--- release " + (this.count + 1));
        if (this.queue.length > 0) {
            console.log("--- queue.length " + this.queue.length);
            let resolver = this.queue.shift();
            if (this.delay > 0) {
                await util.sleep(this.delay);
            }
            resolver();
        }
    }
}

class CountDownLatch {
    count;
    promise;
    resolve;

    constructor(count = 0) {
        this.count = count;
        if (count > 0) {
            this.promise = new Promise((resolve, reject) => {
                this.resolve = resolve;
            });
        } else {
            this.promise = Promise.resolve();
        }
    }

    countDown() {
        if (this.count > 0) {
            this.count--;
            console.log(`Count downs left: ${this.count}`);
            if (this.count === 0) {
                this.resolve();
            }
        }
    }

    async wait() {
        console.log(`Waiting of ${this.count} count downs...`);
        return this.promise;
    }

    //todo auto countDown after N secs unactivity and auto realise after N secs unactivity – _options_
}




module.exports = {Semaphore, CountDownLatch};


