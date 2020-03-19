const {util} = require("./util");

class Semaphore {

    max;
    delay; // a delay before realise
    count = 0;
    queue = [];

    /**
     * max parallel requests count is `63`,
     * but in this case it needs sleepAfterRealise ~ `3500`+ or Fetch error (reason: write EPROTO) will happen
     *
     * Example values:
     * 63, 3500
     * 12, 100
     * 8, 0
     */
    constructor(max = 16, delay = 150) {
        this.max = max;
        this.delay = delay;
    }

    acquire() {
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
    queue = [];
    constructor(count = 0) {
        this.count = count;
    }

    countDown() {
        console.log("countDown " + this.count);
        if (this.count > 0) {
            this.count--;
            if (this.count === 0) {
                this.queue.forEach(resolver => resolver());
            }
        }
    }

    wait() {
        console.log("CountDownLatch: wait" + this.count);
        if (this.count > 0) {
            let resolver;
            const promise = new Promise((resolve, reject) => {
                resolver = resolve;
            });
            this.queue.push(resolver);
            return promise;
        } else {
            return Promise.resolve();
        }
    }

    //todo auto countDown after N secs unactivity and auto realise after N secs unactivity – _options_
}




module.exports = {Semaphore, CountDownLatch};


