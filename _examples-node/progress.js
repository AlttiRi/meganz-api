import {performance} from "../src/browser-context.js";

/** @type {Map<number, Object>} */
const queue = new Map(); // timerId to {startTime, name}
let timerId = null;

/**
 * Prints the progress(loading) line in the console until the promise is resolved.
 * Supports parallel executions.
 *
 * Looks like this: `/ [1][Progress: 1771]`
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {string} name
 * @return {Promise<T>}
 */
export function progress(promise, name = "Progress") {
    const id = startLogging(name);
    return promise.finally(_ => {
        queue.delete(id);
        if (!queue.size) {
            clearInterval(timerId);
            timerId = null;
        }
    });
}

let id = 0;
function startLogging(name) {
    id++;
    const t0 = performance.now();

    queue.set(id, {t0, name});

    if (!timerId) {
        const signs = ["\\", "|", "/", "—"];
        let index = 0;
        timerId = setInterval(_ => {
            const t1 = performance.now();

            let str = "";
            /** @type {Map<string, number[]>} */
            const nameToTimes = new Map();
            for (const elem of queue.values()) {
                if (!nameToTimes.has(elem.name)) {
                    nameToTimes.set(elem.name, []);
                }
                nameToTimes.get(elem.name).push(Math.trunc(t1 - elem.t0));
            }
            for (const [name, times] of nameToTimes.entries()) {
                if (times.length > 2 ) {
                    const maxTime = times.reduce((acc, cur) => acc > cur ? acc : cur);
                    const minTime = times.reduce((acc, cur) => acc < cur ? acc : cur);
                    str += " [" + times.length +"][" + name + ": " + minTime + " - " +maxTime + "]";
                } else {
                    str += " [" + times.length +"][" + name + ": " + times.join(", ") + "]";
                }
            }

            process.stdout.write("\r" + signs[index++] + str + "\r");
            index %= 4;
        }, 250);
    }

    return id;
}