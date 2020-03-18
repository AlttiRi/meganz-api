const {util} = require("./util");

class Semaphore {

    max;
    sleepAfterRealise;
    count = 0;
    queue = [];

    /**
     * max parallel requests count is `63`,
     * but in this case it needs sleepAfterRealise ~ `4000` or Fetch error will happen
     */
    constructor(max = 8, sleepAfterRealise = 0) {
        this.max = max;
    }

    acquire() {
        console.log("--- acquire " + this.count);
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
        console.log("--- release " + this.count);
        if (this.queue.length > 0) {
            if (this.sleepAfterRealise > 0) {
                await util.sleep(this.sleepAfterRealise);
            }
            let resolver = this.queue.shift();
            resolver();
        }
    }
}




// !async function demo() {
//
//     const semaphore = new Semaphore();
//
//     let timerId = setInterval(_ => {
//         semaphore.release();
//         console.log("tik");
//     }, 2000);
//
//
//     console.log(semaphore.acquire());
//     console.log(semaphore.acquire());
//     console.log(1);
//     console.log(semaphore.acquire());
//     await semaphore.acquire();
//     await semaphore.acquire();
//     await semaphore.acquire();
//     await semaphore.acquire();
//     await semaphore.release();
//
//     console.log(2);
//     clearTimeout(timerId);
//
//
//
// }();

module.exports = Semaphore;


