import {isMainThread, parentPort, Worker} from "worker_threads";

if (isMainThread) {
    // Main code
    let worker;
    function handleWithWorker(message) {
        return new Promise(resolve => {
            worker = new Worker(new URL(import.meta.url));
            worker.on("message", message => {
                resolve(message);
                worker.unref(); // OK
            });
            worker.postMessage(message);
            // worker.unref(); // The worker code does not performed
        });
    }
    !async function main() {
        console.log(await handleWithWorker("Qwerty1"));
        // worker.unref(); //
        console.log(await handleWithWorker("Qwerty2"));
        // worker.unref(); //  OK if both are uncommented
    }();
} else {
    // Worker code
    parentPort.on("message",async (message) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        parentPort.postMessage(`"${message}" handled by a worker`);
    });
}
