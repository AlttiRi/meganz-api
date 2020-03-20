const {Semaphore} = require("../synchronization");

// Not the best demo for a semaphore
!async function demo() {

    const semaphore = new Semaphore(2, 0);

    const timerId = setInterval(_ => {
        semaphore.release();
        console.log("tik...");
    }, 2000);

    console.log("--- the start ---");
    console.log(semaphore.acquire()); // Promise { undefined }
    console.log(semaphore.acquire()); // Promise { undefined }
    console.log(semaphore.acquire()); // Promise { <pending> }
    await semaphore.acquire();
    await semaphore.acquire();
    await semaphore.acquire();
    await semaphore.acquire();
    await semaphore.release();

    console.log("--- the end ---");
    clearTimeout(timerId);

}();