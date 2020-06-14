import hooks from "./promise-hooks.js";
hooks.enable();

// Use any function (from `a0` to `a5`):
a4();


function a0() {
    return "a0";
}

async function a1() {
    return "a1";
}


async function a2() {
    return await Promise.resolve("a2");
}

async function a3() {
    return await "a3";
}

async function a4() {
    return Promise.resolve("a4");
}
async function a5() {
    return Promise.resolve(Promise.resolve("a5"));
}