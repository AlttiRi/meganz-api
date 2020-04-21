const {performance} = require("../browser-context");


module.exports.progress = function progress(promise, name = "Loading") {
    const timerId = startLogging(name);
    return promise.finally(_ => clearInterval(timerId));
}

function startLogging(name) {
    const signs = ["\\", "|", "/", "—"];
    let t1;
    let index = 0;
    const t0 = performance.now();
    return setInterval(_ => {
        t1 = performance.now();
        process.stdout.write("\r[" + name + "... " + signs[index++] + " " + Math.trunc(t1 - t0) + " ms] \r");
        index %= 4;
    }, 250);
}