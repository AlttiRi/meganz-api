import {Semaphore} from "../synchronization.js";


async function example() {
    const semaphore = new Semaphore(2, 1000);

    await semaphore.acquire();
    await semaphore.acquire();
    semaphore.release();
    semaphore.release();
    console.log("0");

    console.log("w");
    //await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("w");

    await semaphore.acquire();
    console.log("1");
    await semaphore.acquire();
    console.log("2");


    semaphore.release();
    semaphore.release();
    console.log("3");
    await semaphore.acquire();
    await semaphore.acquire();
    semaphore.release();
    console.log("4");
}



!async function main() {
    console.time("Time");
    await example();
    console.timeEnd("Time");
}();








